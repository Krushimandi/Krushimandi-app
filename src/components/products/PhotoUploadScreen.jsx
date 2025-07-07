import React, { useState, useEffect } from 'react';
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
    const maxPhotos = 4; // Increased to 4 photos
    const [progress, setProgress] = useState(0.33); // Start from 33%
    const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

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
                800, // maxWidth
                800, // maxHeight
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
        try {
            setIsUploading(true);
            
            // Compress image first
            const compressedUri = await compressImage(imageUri);
            
            // Generate unique filename
            const userId = await AsyncStorage.getItem('userData').then(data => {
                const user = JSON.parse(data || '{}');
                return user.uid || 'anonymous';
            });
            
            const timestamp = Date.now();
            const filename = `fruits/${userId}/${timestamp}_${photoIndex}.jpg`;
            
            // Create Firebase storage reference
            const reference = storage().ref(filename);
            
            // Upload file with progress tracking
            const uploadTask = reference.putFile(compressedUri);
            
            // Track upload progress
            uploadTask.on('state_changed', (snapshot) => {
                const uploadProgressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({
                    ...prev,
                    [photoIndex]: uploadProgressPercent
                }));
            });
            
            // Wait for upload to complete
            await uploadTask;
            
            // Get download URL
            const downloadURL = await reference.getDownloadURL();
            
            console.log('Image uploaded successfully:', downloadURL);
            
            // Update photo state with Firebase URL
            setUploadedPhotos(prev => {
                const newPhotos = [...prev];
                if (newPhotos[photoIndex]) {
                    newPhotos[photoIndex] = {
                        ...newPhotos[photoIndex],
                        firebaseUrl: downloadURL,
                        uploading: false
                    };
                }
                return newPhotos;
            });
            
            // Clear progress
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[photoIndex];
                return newProgress;
            });
            
            return downloadURL;
            
        } catch (error) {
            console.error('Firebase upload error:', error);
            Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
            
            // Mark as failed
            setUploadedPhotos(prev => {
                const newPhotos = [...prev];
                if (newPhotos[photoIndex]) {
                    newPhotos[photoIndex] = {
                        ...newPhotos[photoIndex],
                        uploading: false,
                        uploadFailed: true
                    };
                }
                return newPhotos;
            });
            
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handlePhotoUpload = (index) => {
        if (uploadedPhotos.length < maxPhotos || uploadedPhotos[index]) {
            setCurrentPhotoIndex(index);
            // setImagePickerModalVisible(true);
            handleImagePickerOption('camera');
        } else {
            Alert.alert('Maximum Reached', 'You have uploaded the maximum number of photos!');
        }
    };

    const handleImagePickerOption = async (option) => {
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
                console.log('Selected image URI:', imageUri);

                // Create photo object immediately
                const photoObj = {
                    uri: imageUri,
                    firebaseUrl: null,
                    uploading: true,
                    uploadFailed: false
                };

                // Update the photos array
                const newPhotos = [...uploadedPhotos];

                // If we're editing an existing photo
                if (uploadedPhotos[currentPhotoIndex]) {
                    newPhotos[currentPhotoIndex] = photoObj;
                } else {
                    // Add new photo at the first available slot
                    const emptyIndex = newPhotos.findIndex(photo => !photo);
                    if (emptyIndex !== -1) {
                        newPhotos[emptyIndex] = photoObj;
                    } else {
                        newPhotos.push(photoObj);
                    }
                }

                setUploadedPhotos(newPhotos);

                // Start Firebase upload in background
                const photoIndex = uploadedPhotos[currentPhotoIndex] ? currentPhotoIndex : 
                    (newPhotos.findIndex(photo => photo && photo.uri === imageUri));
                
                uploadImageToFirebase(imageUri, photoIndex);
                
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
        const newPhotos = [...uploadedPhotos];
        newPhotos.splice(index, 1);
        setUploadedPhotos(newPhotos);
    };

    const handleContinue = async () => {
        // Check if we have at least one photo with successful upload
        const successfulUploads = uploadedPhotos.filter(photo => photo && photo.firebaseUrl);
        
        if (successfulUploads.length >= 1) {
            await AsyncStorage.setItem('authStep', 'done');

            // Format according to Fruit schema from types/fruit.ts
            const completeProductData = {
                // Will be set by Firestore when saving
                id: '', 
                
                // Basic fruit info
                name: fruitData?.name || '',
                type: fruitData?.type || fruitData?.category || '',
                grade: fruitData?.grade || 'A',
                description: fruitData?.description || '',
                
                // Quantity and pricing
                quantity: fruitData?.quantity || [0, 0],
                price_per_kg: 0, // Will be set in PriceSelectionScreen
                
                // Availability and images
                availability_date: new Date().toISOString(),
                image_urls: successfulUploads.map(photo => photo.firebaseUrl),
                
                // Location info
                location: {
                    village: fruitData?.location?.village || '',
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
                gradeInfo: fruitData?.gradeInfo,
                createdBy: fruitData?.createdBy
            };

            console.log('Complete product data prepared:', completeProductData);

            // Navigate to price selection screen with the complete data
            navigation.navigate('PriceSelection', { productData: completeProductData });

            // Optional feedback
            if (successfulUploads.length < maxPhotos) {
                console.log(`Continuing with ${successfulUploads.length} out of ${maxPhotos} possible photos`);
            }
        } else {
            // Check if images are still uploading
            const stillUploading = uploadedPhotos.some(photo => photo && photo.uploading);
            
            if (stillUploading) {
                Alert.alert(
                    'Images Uploading', 
                    'Please wait for images to finish uploading before continuing.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Upload Required', 
                    'Please upload at least one photo successfully to continue. Try uploading again if any failed.',
                    [{ text: 'OK' }]
                );
            }
        }
    };

    const handleBack = () => {
        navigation.goBack();
        showTabBar();
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Photo Upload',
            'Are you sure you want to continue without adding photos? Photos help attract more buyers.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue Without Photos',
                    style: 'destructive',
                    onPress: async () => {
                        // Create product data without photos following schema
                        const basicProductData = {
                            id: '',
                            name: fruitData?.name || '',
                            type: fruitData?.type || fruitData?.category || '',
                            grade: fruitData?.grade || 'A',
                            description: fruitData?.description || '',
                            quantity: fruitData?.quantity || [0, 0],
                            price_per_kg: 0,
                            availability_date: new Date().toISOString(),
                            image_urls: [], // Empty array for no photos
                            location: {
                                village: fruitData?.location?.village || '',
                                district: fruitData?.location?.district || '',
                                state: fruitData?.location?.state || '',
                                pincode: fruitData?.location?.pincode || '',
                                lat: fruitData?.location?.lat || 0,
                                lng: fruitData?.location?.lng || 0
                            },
                            farmer_id: fruitData?.farmer_id || '',
                            status: 'active',
                            views: 0,
                            likes: 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            // Additional metadata
                            categoryInfo: fruitData?.categoryInfo,
                            gradeInfo: fruitData?.gradeInfo,
                            createdBy: fruitData?.createdBy
                        };

                        // Navigate to price selection screen
                        navigation.navigate('PriceSelection', { productData: basicProductData });
                    }
                },
            ]
        );
    };

    const renderPhotoSlot = (index) => {
        const photo = uploadedPhotos[index];
        const hasPhoto = !!photo;
        const isUploading = photo?.uploading || false;
        const uploadFailed = photo?.uploadFailed || false;
        const uploadProgressPercent = uploadProgress[index] || 0;
        
        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.photoSlot, 
                    hasPhoto && styles.photoSlotFilled,
                    uploadFailed && styles.photoSlotError
                ]}
                onPress={() => handlePhotoUpload(index)}
                disabled={isUploading}
            >
                {hasPhoto ? (
                    <View style={styles.photoContainer}>
                        <Image
                            source={{ uri: photo.uri }}
                            style={styles.photoImage}
                            resizeMode="cover"
                            onError={(error) => {
                                console.log('Image load error:', error);
                                removePhoto(index);
                            }}
                        />
                        
                        {/* Upload Progress Overlay */}
                        {isUploading && (
                            <View style={styles.uploadOverlay}>
                                <View style={styles.progressCircle}>
                                    <Text style={styles.progressText}>{Math.round(uploadProgressPercent)}%</Text>
                                </View>
                            </View>
                        )}
                        
                        {/* Upload Success Indicator */}
                        {photo.firebaseUrl && !isUploading && (
                            <View style={styles.successIndicator}>
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            </View>
                        )}
                        
                        {/* Upload Failed Indicator */}
                        {uploadFailed && (
                            <View style={styles.errorIndicator}>
                                <Ionicons name="alert-circle" size={24} color="#F44336" />
                            </View>
                        )}
                        
                        {!isUploading && (
                            <>
                                <TouchableOpacity style={styles.editButton} onPress={() => handlePhotoUpload(index)}>
                                    <Ionicons name="create-outline" size={16} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
                                    <Ionicons name="close-circle" size={20} color="#f00" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.addPhotoContent}>
                        <Ionicons name="camera-outline" size={32} color="#999" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                    style={[styles.skipButton, uploadedPhotos.filter(p => p?.firebaseUrl).length >= 1 && styles.nextButton]}
                    onPress={uploadedPhotos.filter(p => p?.firebaseUrl).length >= 1 ? handleContinue : handleSkip}
                >
                    <Text style={[
                        styles.skipText,
                        uploadedPhotos.filter(p => p?.firebaseUrl).length >= 1 && styles.nextText
                    ]}>
                        {uploadedPhotos.filter(p => p?.firebaseUrl).length >= 1 ? 'Next' : 'Skip'}
                    </Text>
                    {uploadedPhotos.filter(p => p?.firebaseUrl).length >= 1 && (
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
                                {fruitData.type}: {fruitData.quantity[0]}-{fruitData.quantity[1]} tons (Grade {fruitData.grade})
                            </Text>
                        </View>
                    </View>
                )}

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
                            {`${uploadedPhotos.filter(p => p?.firebaseUrl).length}/${maxPhotos}`}
                        </Text>
                    </View>
                    <Text style={styles.description}>
                        {(() => {
                            const totalPhotos = uploadedPhotos.filter(Boolean).length;
                            const uploadedCount = uploadedPhotos.filter(p => p?.firebaseUrl).length;
                            const uploadingCount = uploadedPhotos.filter(p => p?.uploading).length;
                            const failedCount = uploadedPhotos.filter(p => p?.uploadFailed).length;

                            if (totalPhotos === 0) {
                                return "This is the fun part. Let's start with adding fruit photos to attract buyers.";
                            } else if (uploadingCount > 0) {
                                return `Uploading ${uploadingCount} photo${uploadingCount > 1 ? 's' : ''}... Please wait.`;
                            } else if (failedCount > 0) {
                                return `${failedCount} photo${failedCount > 1 ? 's' : ''} failed to upload. Tap to retry.`;
                            } else if (uploadedCount > 0 && uploadedCount < 3) {
                                return `Looking good! Add ${maxPhotos - uploadedCount} more photos to showcase your product better.`;
                            } else if (uploadedCount >= 3 && uploadedCount < maxPhotos) {
                                return 'Almost there! One more photo will complete your collection.';
                            } else if (uploadedCount === maxPhotos) {
                                return 'Perfect! Your fruit listing is now complete with all photos.';
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

                        <View style={styles.modalOptions}>
                            <TouchableOpacity
                                style={styles.modalOption}
                                onPress={() => handleImagePickerOption('camera')}
                            >
                                <View style={styles.modalOptionIcon}>
                                    <Ionicons name="camera" size={28} color="#4CAF50" />
                                </View>
                                <View style={{ flexDirection: 'column', }}>
                                    <Text style={styles.modalOptionText}>Camera</Text>
                                    <Text style={styles.modalOptionSubtext}>Take a new photo</Text>
                                </View>
                            </TouchableOpacity>

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
        borderColor: '#00d4aa',
        backgroundColor: '#fff',
    },
    photoSlotError: {
        borderColor: '#F44336',
        backgroundColor: '#FFEBEE',
    },
    addPhotoContent: {
        justifyContent: 'center',
        alignItems: 'center',
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
    editButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 28,
        height: 28,
        backgroundColor: '#fff',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
});

export default PhotoUploadScreen;
