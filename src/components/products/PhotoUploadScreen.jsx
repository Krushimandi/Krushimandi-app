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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PhotoUploadScreen = ({ navigation, route }) => {
    // Get fruit data from previous screen
    const { fruitData } = route.params || {};
    
    const [uploadedPhotos, setUploadedPhotos] = useState([]); // Array of photo URIs
    const maxPhotos = 4; // Increased to 4 photos
    const progress = 0.66; // 66% for the second step (photo upload)

    const handlePhotoUpload = (index) => {
        if (uploadedPhotos.length < maxPhotos || uploadedPhotos[index]) {
            Alert.alert(
                uploadedPhotos[index] ? 'Edit Photo' : 'Upload Photo',
                'Select photo source:',
                [
                    { text: 'Camera', onPress: () => simulatePhotoUpload(index) },
                    { text: 'Gallery', onPress: () => simulatePhotoUpload(index) },
                    uploadedPhotos[index] && { text: 'Remove', style: 'destructive', onPress: () => removePhoto(index) },
                    { text: 'Cancel', style: 'cancel' }
                ].filter(Boolean)
            );
        } else {
            Alert.alert('Maximum Reached', 'You have uploaded the maximum number of photos!');
        }
    };

    const simulatePhotoUpload = (index) => {
        // Simulate photo upload process with a placeholder URI
        setTimeout(() => {
            const newPhotos = [...uploadedPhotos];
            newPhotos[index] = 'https://placehold.co/140x180/png'; // Replace with real URI in production
            setUploadedPhotos(newPhotos.filter(Boolean));
            Alert.alert('Success', 'Photo uploaded successfully!');
        }, 500);
    };

    const removePhoto = (index) => {
        const newPhotos = [...uploadedPhotos];
        newPhotos.splice(index, 1);
        setUploadedPhotos(newPhotos);
    };    const handleContinue = async () => {
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
    };    const handleSkip = () => {
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
                        <Image source={{ uri: uploadedPhotos[index] }} style={styles.photoImage} />
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
    };    return (
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
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{marginLeft: 4}} />
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
            </ScrollView>            {/* Removed continue button - using Next button in header instead */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({    safeArea: {
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
    },    header: {
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
    },    headerText: {
        fontSize: 18,
        fontWeight: '700', // Made bolder
        color: '#212121',
    },skipButton: {
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
    },    scrollView: {
        flex: 1,
    },    scrollViewContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120, // Increased bottom padding to account for bottom navigation
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },    title: {
        fontSize: 24,
        fontWeight: '800', // Extra bold
        color: '#000',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },photoGrid: {
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
    },    /* Removed button container and continue button styles as they're no longer needed */
});

export default PhotoUploadScreen;
