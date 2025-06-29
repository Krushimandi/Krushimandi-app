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
import { requestImagePickerPermissions } from '../../utils/permissions';
import { useTabBarControl } from '../../utils/navigationControls';

const PhotoUploadScreen = ({ navigation, route }) => {
    // Get fruit data from previous screen
    const { fruitData } = route.params || {};

    const { showTabBar, hideTabBar } = useTabBarControl();
    const [uploadedPhotos, setUploadedPhotos] = useState([]); // Array of photo URIs
    const maxPhotos = 4; // Increased to 4 photos
    const [progress, setProgress] = useState(0.33); // Start from 33%
    const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    useEffect(() => {
        // Hide tab bar for this screen
        hideTabBar();
    }, []);

    useEffect(() => {
        const photoProgress = (uploadedPhotos.length / maxPhotos) * 0.33; // Remaining 33%
        setProgress(0.33 + photoProgress);
    }, [uploadedPhotos]);

    const handlePhotoUpload = (index) => {
        if (uploadedPhotos.length < maxPhotos || uploadedPhotos[index]) {
            setCurrentPhotoIndex(index);
            setImagePickerModalVisible(true);
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

        const handleImageResponse = (response) => {
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

                // Update the photos array
                const newPhotos = [...uploadedPhotos];

                // If we're editing an existing photo
                if (uploadedPhotos[currentPhotoIndex]) {
                    newPhotos[currentPhotoIndex] = imageUri;
                } else {
                    // Add new photo at the first available slot
                    const emptyIndex = newPhotos.findIndex(photo => !photo);
                    if (emptyIndex !== -1) {
                        newPhotos[emptyIndex] = imageUri;
                    } else {
                        newPhotos.push(imageUri);
                    }
                }

                setUploadedPhotos(newPhotos.filter(Boolean));
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
    }; const handleContinue = async () => {
        if (uploadedPhotos.length >= 1) {
            await AsyncStorage.setItem('authStep', 'done');

            // Combine fruit data with photo data
            const completeProductData = {
                ...fruitData,
                photos: uploadedPhotos,
                // Default price - this will be updated in PriceSelectionScreen
                price: 0,
                rating: 5.0,
            };

            // Navigate to price selection screen with the combined data
            navigation.navigate('PriceSelection', { productData: completeProductData });

            // Optional feedback if they haven't uploaded all photos but are continuing anyway
            if (uploadedPhotos.length < maxPhotos) {
                // This could be a Toast notification instead of an Alert in a real app
                console.log(`Continuing with ${uploadedPhotos.length} out of ${maxPhotos} possible photos`);
            }
        } else {
            Alert.alert('Upload Required', 'Please upload at least one photo to continue');
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
                        // Create product data without photos
                        const basicProductData = {
                            ...fruitData,
                            photos: [],
                            price: 0,
                            rating: 5.0,
                        };

                        // Navigate to price selection screen
                        navigation.navigate('PriceSelection', { productData: basicProductData });
                    }
                },
            ]
        );
    };

    const renderPhotoSlot = (index) => {
        const hasPhoto = !!uploadedPhotos[index];
        return (
            <TouchableOpacity
                key={index}
                style={[styles.photoSlot, hasPhoto && styles.photoSlotFilled]}
                onPress={() => handlePhotoUpload(index)}
            >
                {hasPhoto ? (
                    <View style={styles.photoContainer}>
                        <Image
                            source={{ uri: uploadedPhotos[index] }}
                            style={styles.photoImage}
                            resizeMode="cover"
                            onError={(error) => {
                                console.log('Image load error:', error);
                                // Remove the problematic image
                                removePhoto(index);
                            }}
                        />
                        <TouchableOpacity style={styles.editButton} onPress={() => handlePhotoUpload(index)}>
                            <Ionicons name="create-outline" size={16} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
                            <Ionicons name="close-circle" size={20} color="#f00" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.addPhotoContent}>
                        <Ionicons name="camera-outline" size={32} color="#999" />
                    </View>
                )}
            </TouchableOpacity>
        );
    }; return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Add Photos</Text>
                <TouchableOpacity
                    style={[styles.skipButton, uploadedPhotos.length >= 1 && styles.nextButton]}
                    onPress={uploadedPhotos.length >= 1 ? handleContinue : handleSkip}
                >
                    <Text style={[
                        styles.skipText,
                        uploadedPhotos.length >= 1 && styles.nextText
                    ]}>
                        {uploadedPhotos.length >= 1 ? 'Next' : 'Skip'}
                    </Text>
                    {uploadedPhotos.length >= 1 && (
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
                                name={fruitData.category?.id === 'mango' ? 'fruit-cherries' : 'fruit-watermelon'}
                                size={24}
                                color="#4CAF50"
                            />
                            <Text style={styles.fruitInfoText}>
                                {fruitData.category?.name || fruitData.category}: {fruitData.quantity}
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
                        <Text style={styles.stepNumber}>{`${uploadedPhotos.length}/${maxPhotos}`}</Text>
                    </View>                    <Text style={styles.description}>
                        {uploadedPhotos.length === 0 && "This is the fun part. Let's start with adding fruit photos to attract buyers."}
                        {uploadedPhotos.length > 0 && uploadedPhotos.length < 3 && `Looking good! Add ${maxPhotos - uploadedPhotos.length} more photos to showcase your product better.`}
                        {uploadedPhotos.length >= 3 && uploadedPhotos.length < maxPhotos && 'Almost there! One more photo will complete your collection.'}
                        {uploadedPhotos.length === maxPhotos && 'Perfect! Your fruit listing is now complete with all photos.'}
                    </Text></View>
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
    }, header: {
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
    }, headerText: {
        fontSize: 18,
        fontWeight: '700', // Made bolder
        color: '#212121',
    }, skipButton: {
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
    }, scrollView: {
        flex: 1,
    }, scrollViewContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120, // Increased bottom padding to account for bottom navigation
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    }, title: {
        fontSize: 24,
        fontWeight: '800', // Extra bold
        color: '#000',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    }, photoGrid: {
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
    addPhotoContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#4a5568',
        borderRadius: 14,
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

    /* Removed button container and continue button styles as they're no longer needed */
});

export default PhotoUploadScreen;
