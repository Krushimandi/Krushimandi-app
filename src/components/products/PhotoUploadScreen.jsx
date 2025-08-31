import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Image,
    Alert,
    Platform,
    ScrollView,
    Dimensions,
    Modal,
    ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import { requestImagePickerPermissions } from '../../utils/permissions';
import { useTabBarControl } from '../../utils/navigationControls';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const PhotoUploadScreen = ({ navigation, route }) => {
    // Get fruit data from previous screen
    const { fruitData } = route.params || {};

    const { showTabBar, hideTabBar } = useTabBarControl();
    const [uploadedPhotos, setUploadedPhotos] = useState([]); // Array of {uri, firebaseUrl, uploading}
    const [uploadProgress, setUploadProgress] = useState({}); // Track upload progress per photo
    const [showUploadProgress, setShowUploadProgress] = useState(false); // Show progress only when user clicks Next
    const [pendingUploads, setPendingUploads] = useState(new Set()); // Track which photos are still uploading
    const [uploadTasks, setUploadTasks] = useState({}); // Track Firebase upload tasks for cancellation
    const maxPhotos = 4; // Increased to 4 photos
    const minPhotos = 2; // Minimum required photos
    const [progress, setProgress] = useState(0.33); // Start from 33%
    const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    // Upload queue management
    const [uploadQueue, setUploadQueue] = useState([]); // Array of { index, uri, id }
    const queueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);

    // Helper to sync queue ref and state
    const setQueue = (updater) => {
        setUploadQueue(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            queueRef.current = next;
            return next;
        });
    };

    useEffect(() => {
        // Hide tab bar for this screen
        hideTabBar();
    }, []);

    useEffect(() => {
        const photoProgress = (uploadedPhotos.filter(p => p?.firebaseUrl).length / maxPhotos) * 0.33; // Remaining 33%
        setProgress(0.33 + photoProgress);
    }, [uploadedPhotos]);

    // Compress image for faster upload
    const compressImage = async (imageUri) => {
        try {
            const compressedImage = await ImageResizer.createResizedImage(
                imageUri,
                600, // maxWidth
                600, // maxHeight
                'JPEG', // format
                80, // quality (0-100)
                0, // rotation
                undefined, // outputPath
                false, // keepMeta
                {
                    mode: 'contain',
                    onlyScaleDown: true
                }
            );
            return compressedImage.uri;
        } catch (error) {
            console.log('Image compression failed:', error);
            return imageUri; // Return original if compression fails
        }
    };

    // Upload image to Firebase Storage
    const uploadImageToFirebase = async (imageUri, photoIndex) => {
        console.log(`🔄 Starting upload for index: ${photoIndex}, URI: ${imageUri.substring(0, 50)}...`);

        // Double-check that we should proceed with this upload
        if (pendingUploads.has(photoIndex)) {
            console.log(`⚠️ Upload already pending for index ${photoIndex}, skipping duplicate`);
            return;
        }

        try {
            // Add to pending uploads immediately
            setPendingUploads(prev => {
                const newSet = new Set([...prev, photoIndex]);
                console.log(`➕ Added index ${photoIndex} to pending uploads. Total pending: ${newSet.size}`);
                console.log(`📋 All pending uploads:`, Array.from(newSet));
                return newSet;
            });

            // Compress image first for faster upload and smaller file size
            console.log(`🗜️ Compressing image for index ${photoIndex}...`);
            const compressedUri = await compressImage(imageUri);
            console.log(`✅ Image compressed for index ${photoIndex}`);

            // Generate unique filename with timestamp to avoid conflicts
            const userId = await AsyncStorage.getItem('userData').then(data => {
                const user = JSON.parse(data || '{}');
                return user.uid || 'anonymous';
            });

            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const filename = `fruits/${userId}/${timestamp}_${randomId}_${photoIndex}.jpg`;

            // Create Firebase storage reference
            const reference = storage().ref(filename);

            // Upload file with progress tracking
            const uploadTask = reference.putFile(compressedUri);

            // Store upload task for cancellation
            setUploadTasks(prev => ({
                ...prev,
                [photoIndex]: uploadTask
            }));

            // Track upload progress (only if showing progress)
            uploadTask.on('state_changed', (snapshot) => {
                if (showUploadProgress) {
                    const uploadProgressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({
                        ...prev,
                        [photoIndex]: Math.round(uploadProgressPercent)
                    }));
                }
            });

            // Wait for upload to complete
            await uploadTask;

            // Get download URL
            const downloadURL = await reference.getDownloadURL();

            console.log(`✅ Image uploaded successfully for index: ${photoIndex}`);
            console.log(`🔗 Download URL: ${downloadURL.substring(0, 50)}...`);

            // Update photo state with Firebase URL (if still present)
            setUploadedPhotos(prev => {
                const newPhotos = [...prev];
                if (newPhotos[photoIndex]) {
                    newPhotos[photoIndex] = {
                        ...newPhotos[photoIndex],
                        firebaseUrl: downloadURL,
                        uploading: false
                    };
                    console.log(`📝 Updated photo at index ${photoIndex} with download URL. Upload complete!`);
                } else {
                    console.warn(`⚠️ Slot ${photoIndex} no longer exists or was cleared; skipping update.`);
                }
                return newPhotos;
            });

            // Remove from pending uploads and upload tasks
            setPendingUploads(prev => {
                const newSet = new Set(prev);
                newSet.delete(photoIndex);
                console.log(`➖ Removed index ${photoIndex} from pending uploads. Remaining: ${newSet.size}`);
                return newSet;
            });

            setUploadTasks(prev => {
                const newTasks = { ...prev };
                delete newTasks[photoIndex];
                return newTasks;
            });

            // Clear progress for this photo
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[photoIndex];
                return newProgress;
            });

            // Kick the queue to process next
            setTimeout(processQueue, 0);
            return downloadURL;

        } catch (error) {
            console.error(`❌ Firebase upload error for index: ${photoIndex}`, error);

            // Check if it was cancelled
            if (error.code === 'storage/cancelled') {
                console.log(`🚫 Upload cancelled for index: ${photoIndex}`);
                return null;
            }

            // Mark as failed and remove from pending uploads
            setUploadedPhotos(prev => {
                const newPhotos = [...prev];
                if (newPhotos[photoIndex]) {
                    newPhotos[photoIndex] = {
                        ...newPhotos[photoIndex],
                        uploading: false,
                        uploadFailed: true
                    };
                    console.log(`💥 Marked photo at index ${photoIndex} as failed`);
                } else {
                    console.error(`❌ ERROR: Cannot mark failed - no photo at index ${photoIndex}`);
                }
                return newPhotos;
            });

            setPendingUploads(prev => {
                const newSet = new Set(prev);
                newSet.delete(photoIndex);
                console.log(`➖ Removed failed upload index ${photoIndex} from pending. Remaining: ${newSet.size}`);
                return newSet;
            });

            setUploadTasks(prev => {
                const newTasks = { ...prev };
                delete newTasks[photoIndex];
                return newTasks;
            });

            // Continue processing remaining queue despite failure/cancel
            setTimeout(processQueue, 0);
            return null;
        }
    };

    // const handlePhotoUpload = (index) => {
    //     console.log(`📸 handlePhotoUpload called with index: ${index}`);

    //     // Find the first empty slot that should be filled
    //     const nextSlotToFill = getNextAvailableSlot();

    //     // Only allow clicking on the next slot to fill
    //     if (index !== nextSlotToFill) {
    //         console.log(`❌ Can only fill slot ${nextSlotToFill} next, clicked: ${index}`);
    //         return; // Do nothing if wrong slot clicked
    //     }

    //     // Proceed with photo upload for the correct slot
    //     setCurrentPhotoIndex(nextSlotToFill);
    //     console.log(`📍 Set currentPhotoIndex to: ${nextSlotToFill}`);

    //     // Directly open camera instead of showing modal
    //     handleImagePickerOption('camera');
    // };


    const handlePhotoUpload = (index) => {
        console.log(`📸 handlePhotoUpload called with index: ${index}`);

        // Find the first empty slot that should be filled
        const nextSlotToFill = getNextAvailableSlot();

        // Only allow clicking on the next slot to fill
        if (index !== nextSlotToFill) {
            console.log(`❌ Can only fill slot ${nextSlotToFill} next, clicked: ${index}`);
            return; // Do nothing if wrong slot clicked
        }

        // Set current photo index and show modal
        setCurrentPhotoIndex(nextSlotToFill);
        setImagePickerModalVisible(true); // Show modal instead of direct camera launch
    };

















    const handleImagePickerOption = async (option, targetIndexOverride) => {
        setImagePickerModalVisible(false);

        // Request permissions first
        const hasPermissions = await requestImagePickerPermissions();
        if (!hasPermissions) {
            return;
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            maxHeight: 800,
            maxWidth: 800,
            quality: 0.8,
        };

        const targetIndexCaptured = (typeof targetIndexOverride === 'number') ? targetIndexOverride : currentPhotoIndex;
        const handleImageResponse = async (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
                return;
            }

            if (response.errorMessage) {
                console.log('Image picker error:', response.errorMessage);
                Alert.alert('Error', 'Failed to select image. Please try again.');
                return;
            }

            if (response.assets && response.assets[0]) {
                const imageUri = response.assets[0].uri;
                const targetIndex = targetIndexCaptured;
                console.log(`📷 Selected image URI: ${imageUri.substring(0, 50)}...`);
                console.log(`🎯 Target index: ${targetIndex}`);

                // Double-check that the slot is still empty before proceeding
                if (uploadedPhotos[targetIndex]) {
                    console.log(`❌ Slot ${targetIndex} is no longer empty, aborting upload`);
                    Alert.alert(
                        'Slot Already Filled',
                        'This slot already has a photo. Please delete it first if you want to replace it.',
                        [{ text: 'OK' }]
                    );
                    return;
                }

                // Create photo object immediately
                const photoObj = {
                    uri: imageUri,
                    firebaseUrl: null,
                    uploading: true,
                    uploadFailed: false
                };

                // Update photos array - place photo object at target index
                setUploadedPhotos(prev => {
                    // If the slot got filled in the meantime, abort (no replacement)
                    if (prev[targetIndex]) {
                        console.log(`⛔ Slot ${targetIndex} filled before commit, aborting add`);
                        return prev;
                    }
                    const newPhotos = [...prev];

                    // Ensure array is large enough for target index
                    while (newPhotos.length <= targetIndex) {
                        newPhotos.push(null);
                    }

                    // Place the photo object at the target index
                    newPhotos[targetIndex] = photoObj;
                    console.log(`✅ Photo object placed at index: ${targetIndex}`);
                    console.log(`📊 Updated photos array:`, newPhotos.map((p, i) => ({ index: i, hasPhoto: !!p, uploading: p?.uploading })));
                    return newPhotos;
                });

                console.log(`� Enqueue upload for index: ${targetIndex}`);
                // Enqueue upload; processor handles sequential execution
                enqueueUpload(imageUri, targetIndex);

            } else {
                console.log('No image selected');
                Alert.alert('Error', 'No image was selected. Please try again.');
            }
        };

        if (option === 'camera') {
            launchCamera(options, handleImageResponse);
        } else if (option === 'gallery') {
            launchImageLibrary(options, handleImageResponse);
        }
    };

    const removePhoto = (index) => {
        console.log(`🗑️ Removing photo at index: ${index}`);

        // Cancel upload if it's still uploading
        if (pendingUploads.has(index)) {
            const uploadTask = uploadTasks[index];
            if (uploadTask) {
                uploadTask.cancel();
                console.log(`❌ Cancelled upload for index: ${index}`);
            }
        }

        // Remove from pending uploads if it's still uploading
        setPendingUploads(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            console.log(`➖ Removed index ${index} from pending uploads`);
            return newSet;
        });

        // Clear upload progress and task
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[index];
            return newProgress;
        });

        setUploadTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[index];
            return newTasks;
        });

        // Remove photo and shift all later photos forward to maintain sequential order
        setUploadedPhotos(prev => {
            const newPhotos = [...prev];
            // Remove the photo at index
            newPhotos.splice(index, 1);
            // Fill remaining slots with null to maintain array length
            while (newPhotos.length < maxPhotos) {
                newPhotos.push(null);
            }
            console.log(`🔄 Photo removed from index ${index} and array shifted. Updated array:`,
                newPhotos.map((p, i) => ({ index: i, hasPhoto: !!p })));
            return newPhotos;
        });

        // Re-index queued tasks so they point to the new shifted positions
        setQueue(prev => {
            const adjusted = prev.map(task => {
                if (task.index > index) {
                    return { ...task, index: task.index - 1 };
                }
                return task;
            });
            return adjusted;
        });
    };

    const handleContinue = async () => {
        // Count photos that have been selected (not null)
        const selectedPhotos = uploadedPhotos.filter(photo => photo !== null && photo !== undefined);
        const stillUploading = pendingUploads.size > 0;

        // If images are still uploading, show progress and wait
        if (stillUploading) {
            setShowUploadProgress(true);
            Alert.alert(
                'Images Uploading',
                `Please wait for ${pendingUploads.size} image${pendingUploads.size > 1 ? 's' : ''} to finish uploading before continuing.`,
                [{ text: 'Wait' }]
            );
            return;
        }

        // Check minimum photo requirement after all uploads are done
        if (selectedPhotos.length < minPhotos) {
            Alert.alert(
                'More Photos Required',
                `Please upload at least ${minPhotos} photos to continue. You currently have ${selectedPhotos.length} photo${selectedPhotos.length !== 1 ? 's' : ''}.`,
                [{ text: 'OK' }]
            );
            return;
        }

        if (selectedPhotos.length >= minPhotos) {
            // Extract Firebase URLs or use local URIs as fallback
            const photoUrls = selectedPhotos.map(photo => photo.firebaseUrl || photo.uri);
            proceedWithPhotos(photoUrls);
        }
    };

    const proceedWithPhotos = async (successfulUploads) => {
        await AsyncStorage.setItem('authStep', 'done');

        // Format according to Fruit schema from types/fruit.ts
        const completeProductData = {
            // Will be set by Firestore when saving
            id: '',

            // Basic fruit info
            name: fruitData?.name || '',
            type: fruitData?.type || fruitData?.category || '',
            // grade: fruitData?.grade || 'A',
            description: fruitData?.description || '',

            // Quantity and pricing
            quantity: fruitData?.quantity || [0, 0],
            price_per_kg: 0, // Will be set in PriceSelectionScreen

            // Availability and images
            availability_date: new Date().toISOString(),
            image_urls: successfulUploads, // These are now Firebase URLs or local URIs

            // Location info
            location: {
                city: fruitData?.location?.city || '',
                district: fruitData?.location?.district || '',
                state: fruitData?.location?.state || '',
                pincode: fruitData?.location?.pincode || '',
                lat: fruitData?.location?.lat || 0,
                lng: fruitData?.location?.lng || 0
            },

            // User reference
            farmer_id: fruitData?.farmer_id || '',

            // Status and metadata
            status: 'active',
            views: 0,
            likes: 0,

            // Timestamps - will be updated when saving to Firebase
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),

            // Additional metadata for UI (not part of schema but useful)
            categoryInfo: fruitData?.categoryInfo,
            // gradeInfo: fruitData?.gradeInfo,
            createdBy: fruitData?.createdBy
        };

        console.log('Complete product data prepared:', completeProductData);

        // Navigate to price selection screen with the complete data
        navigation.navigate('PriceSelection', { productData: completeProductData });

        // Optional feedback
        if (successfulUploads.length < maxPhotos) {
            console.log(`Continuing with ${successfulUploads.length} out of ${maxPhotos} possible photos`);
        }
    };

    const handleBack = () => {
        navigation.goBack();
        showTabBar();
    };

    const handleSkip = () => {
        // Skip is now disabled - this function should not be called
        return;
    };

    // Start processing the upload queue sequentially
    const processQueue = async () => {
        if (isProcessingQueueRef.current) return;
        if (!queueRef.current.length) return;
        isProcessingQueueRef.current = true;
        try {
            while (queueRef.current.length) {
                const task = queueRef.current[0];
                // Skip if slot already got a photo (user might have deleted/cancelled)
                if (!uploadedPhotos[task.index] || uploadedPhotos[task.index]?.uploading) {
                    // Perform upload for this task
                    await uploadImageToFirebase(task.uri, task.index);
                }
                // Remove processed task
                setQueue(prev => prev.slice(1));
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    };

    const enqueueUpload = (uri, index) => {
        const id = `${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setQueue(prev => [...prev, { index, uri, id }]);
        // Kick off processor in next tick
        setTimeout(processQueue, 0);
    };

    const renderPhotoSlot = (index) => {
        const photo = uploadedPhotos[index];
        const photoUri = photo?.uri;
        const isPending = pendingUploads.has(index);
        const isUploading = photo?.uploading || isPending;
        const hasPhoto = !!photo;
        const anyUploadsInProgress = pendingUploads.size > 0;
        const isSlotDisabled = hasPhoto; // Disable only if this slot already has a photo

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.photoSlot,
                    photo && styles.photoSlotFilled,
                    !photo && styles.photoSlotEmpty,
                    isSlotDisabled && styles.photoSlotDisabled
                ]}
                onPress={() => handlePhotoUpload(index)}
                disabled={isSlotDisabled}
            >
                {photo ? (
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: photoUri }} style={styles.uploadedPhoto} />
                        {isUploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="#FFF" size="small" />
                                <Text style={styles.uploadingText}>Uploading...</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                removePhoto(index);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="close-circle"
                                size={24}
                                color="#ff4444"
                            />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.placeholderContent}>
                        <Ionicons
                            name="camera-outline"
                            size={30}
                            color={anyUploadsInProgress ? "#999" : "#666"}
                        />
                        <Text style={[
                            styles.placeholderText,
                            anyUploadsInProgress && { color: '#999' }
                        ]}>
                            {`Photo ${index + 1}`}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Calculate the number of photos that have been selected (not necessarily uploaded)
    const filledCount = uploadedPhotos.filter(photo => photo !== null && photo !== undefined).length;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Add Photos</Text>
                <TouchableOpacity
                    style={[
                        styles.skipButton,
                        (filledCount >= 2 && pendingUploads.size === 0) && styles.nextButton,
                        (filledCount < 2 || pendingUploads.size > 0) && styles.disabledButton
                    ]}
                    onPress={(filledCount >= 2 && pendingUploads.size === 0) ? handleContinue : null}
                    disabled={filledCount < 2 || pendingUploads.size > 0}
                >
                    <Text style={[
                        styles.skipText,
                        (filledCount >= 2 && pendingUploads.size === 0) && styles.nextText,
                        (filledCount < 2 || pendingUploads.size > 0) && styles.disabledButtonText
                    ]}>Next
                    </Text>
                    {(filledCount >= 2 && pendingUploads.size === 0) && (
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>Step 2 of 3</Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Add photos of {fruitData?.name || 'fruits'}</Text>

                {/* Fruit Info Summary */}
                {fruitData && (
                    <View style={styles.fruitInfoCard}>
                        <View style={styles.fruitInfoRow}>
                            <MaterialCommunityIcons
                                name={fruitData.type === 'mango' ? 'fruit-cherries' : 'fruit-watermelon'}
                                size={24}
                                color="#4CAF50"
                            />
                            <Text style={styles.fruitInfoText}>
                                {fruitData.type}: {fruitData.quantity[0]}-{fruitData.quantity[1]} tons
                                {/* (Grade {fruitData.grade}) */}
                            </Text>
                        </View>
                    </View>
                )}








                <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => handleImagePickerOption('gallery')}
                >
                    <View style={styles.modalOptionIcon}>
                        <Ionicons name="images" size={28} color="#2196F3" />
                    </View>

                    <View style={{ flexDirection: 'column' }}>
                        <Text style={styles.modalOptionText}>Gallery</Text>
                        <Text style={styles.modalOptionSubtext}>Choose from gallery</Text>
                    </View>
                </TouchableOpacity>




















                {/* Photo Grid - 2x2 grid layout */}
                <View style={styles.photoGrid}>
                    <View style={styles.photoRow}>
                        {[0, 1].map(renderPhotoSlot)}
                    </View>
                    <View style={[styles.photoRow, { marginTop: 16 }]}>
                        {[2, 3].map(renderPhotoSlot)}
                    </View>
                </View>

                {/* Step Info */}
                <View style={styles.stepInfo}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepNumber}>
                            {`${uploadedPhotos.filter(Boolean).length}/${maxPhotos}`}
                        </Text>
                    </View>
                    <Text style={styles.description}>
                        {(() => {
                            const totalPhotos = uploadedPhotos.filter(Boolean).length;
                            const uploadingCount = pendingUploads.size;

                            if (totalPhotos === 0) {
                                return `Upload at least ${minPhotos} photos to showcase your fruit quality and attract buyers.`;
                            } else if (uploadingCount > 0) {
                                return `${uploadingCount} photo${uploadingCount > 1 ? 's are' : ' is'} uploading in background...`;
                            } else if (totalPhotos < minPhotos) {
                                return `Upload ${minPhotos - totalPhotos} more photo${minPhotos - totalPhotos > 1 ? 's' : ''} to meet minimum requirement.`;
                            } else if (totalPhotos >= minPhotos && totalPhotos < maxPhotos) {
                                return `Great! You can add ${maxPhotos - totalPhotos} more photo${maxPhotos - totalPhotos > 1 ? 's' : ''} to showcase better.`;
                            } else if (totalPhotos === maxPhotos) {
                                return 'Perfect! Your fruit listing is complete with all photos.';
                            } else {
                                return "Upload photos to continue.";
                            }
                        })()}
                    </Text>
                </View>
            </ScrollView>

            {/* Modern Image Picker Modal */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={imagePickerModalVisible}
                onRequestClose={() => setImagePickerModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {uploadedPhotos[currentPhotoIndex] ? 'Edit Photo' : 'Add Photo'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setImagePickerModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Choose how you want to add your photo
                        </Text>

                        {/* <View style={styles.modalOptions}>
                            <TouchableOpacity
                                style={styles.modalOption}
                                onPress={() => handleImagePickerOption('camera', currentPhotoIndex)}
                            >
                                <View style={styles.modalOptionIcon}>
                                    <Ionicons name="camera" size={28} color="#4CAF50" />
                                </View>
                                <View style={{ flexDirection: 'column', }}>
                                    <Text style={styles.modalOptionText}>Camera</Text>
                                    <Text style={styles.modalOptionSubtext}>Take a new photo</Text>
                                </View>
                            </TouchableOpacity>

                            {/* <TouchableOpacity
                                style={styles.modalOption}
                                onPress={() => handleImagePickerOption('gallery')}
                            >
                                <View style={styles.modalOptionIcon}>
                                    <Ionicons name="images" size={28} color="#2196F3" />
                                </View>

                                <View style={{ flexDirection: 'column' }}>
                                    <Text style={styles.modalOptionText}>Gallery</Text>
                                    <Text style={styles.modalOptionSubtext}>Choose from gallery</Text>
                                </View>
                            </TouchableOpacity> */}
                        {/* </View>  */}



                        <View style={styles.modalOptionsContainer}>
                            <TouchableOpacity
                                style={styles.modalOption}
                                onPress={() => handleImagePickerOption('camera')}
                            >
                                <View style={styles.modalOptionIcon}>
                                    <Ionicons name="camera" size={28} color="#4CAF50" />
                                </View>
                                <Text style={styles.modalOptionText}>Camera</Text>
                                <Text style={styles.modalOptionSubtext}>Take a new photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalOption}
                                onPress={() => handleImagePickerOption('gallery')}
                            >
                                <View style={styles.modalOptionIcon}>
                                    <Ionicons name="images" size={28} color="#2196F3" />
                                </View>
                                <Text style={styles.modalOptionText}>Gallery</Text>
                                <Text style={styles.modalOptionSubtext}>Choose existing</Text>
                            </TouchableOpacity>
                        </View>























                        {uploadedPhotos[currentPhotoIndex] && (
                            <TouchableOpacity
                                style={styles.removePhotoButton}
                                onPress={() => {
                                    setImagePickerModalVisible(false);
                                    removePhoto(currentPhotoIndex);
                                }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#F44336" />
                                <Text style={styles.removePhotoText}>Remove Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Removed continue button - using Next button in header instead */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    progressContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8F9FA',
    },
    progressBackground: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#757575',
        marginTop: 4,
        textAlign: 'right',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
        paddingBottom: 10,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212121',
    },
    skipButton: {
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    nextButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    skipText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    nextText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    disabledButton: {
        backgroundColor: '#CCC',
        opacity: 0.6,
    },
    disabledButtonText: {
        color: '#888',
    },
    fruitInfoCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        marginTop: -10,
    },
    fruitInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    fruitInfoText: {
        fontSize: 15,
        color: '#212121',
        marginLeft: 10,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    photoGrid: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    photoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    photoSlot: {
        width: 130,
        height: 130,
        backgroundColor: '#f5f5f5',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoSlotFilled: {
        borderStyle: 'solid',
        borderColor: '#f5f5f5',
        backgroundColor: '#fff',
    },
    photoSlotEmpty: {
        backgroundColor: '#f8f8f8',
        borderColor: '#4CAF50',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    photoSlotDisabled: {
        backgroundColor: '#f9f9f9',
        borderColor: '#e5e5e5',
        opacity: 0.8,
    },
    photoSlotNext: {
        backgroundColor: '#f0f0f0',
        borderColor: '#00d4aa',
        borderWidth: 3,
    },
    photoSlotError: {
        borderColor: '#F44336',
        backgroundColor: '#FFEBEE',
    },
    addPhotoContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    placeholderTextDisabled: {
        color: '#ccc',
    },
    photoContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    photoImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#4a5568',
        borderRadius: 14,
    },
    uploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    progressCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    successIndicator: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 2,
    },
    errorIndicator: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 2,
    },
    uploadingIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },

    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 2,
    },
    stepInfo: {
        alignItems: 'center',
        marginBottom: 40,
    },
    stepBadge: {
        backgroundColor: '#f3f3f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111111',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#212121',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalOptions: {
        marginBottom: 16,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginBottom: 12,
    },
    modalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modalOptionText: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#212121',
    },
    modalOptionSubtext: {
        fontSize: 14,
        color: '#666',
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
        marginTop: 8,
    },
    removePhotoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F44336',
        marginLeft: 8,
    },
    uploadedPhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingText: {
        color: '#FFF',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '600',
    },
    editButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        elevation: 4,
    },
});





const additionalStyles = {
    modalOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalOption: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginBottom: 12,
    },
    modalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212121',
        textAlign: 'center',
    },
    modalOptionSubtext: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginTop: 4,
    },
};
Object.assign(styles, additionalStyles);
export default PhotoUploadScreen;
