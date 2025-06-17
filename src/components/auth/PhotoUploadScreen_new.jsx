import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PhotoUploadScreen = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState(0); // 0-4: photos uploaded
  const [progress] = useState(0.8); // 80% progress for photo upload screen

  // Step configurations for 4 photos
  const stepConfigs = [
    {
      stepNumber: '0/4',
      title: 'Add you cutest pics',
      description: 'This is the fun part. Let\'s start with 4 pictures and we\'ll take it from there.',
      photos: [],
    },
    {
      stepNumber: '1/4',
      title: 'Add you cutest pics',
      description: 'Great start! Upload 3 more photos to complete your profile.',
      photos: [1],
    },
    {
      stepNumber: '2/4',
      title: 'Add you cutest pics',
      description: 'You\'re halfway there! 2 more photos to go.',
      photos: [1, 2],
    },
    {
      stepNumber: '3/4',
      title: 'Add you cutest pics',
      description: 'Almost done! Just 1 more photo to complete your profile.',
      photos: [1, 2, 3],
    },
    {
      stepNumber: '4/4',
      title: 'Add you cutest pics',
      description: 'Perfect! Your profile is complete with amazing photos.',
      photos: [1, 2, 3, 4],
    },
  ];

  const currentConfig = stepConfigs[currentStep];

  const handlePhotoUpload = () => {
    if (currentStep < 4) {
      Alert.alert(
        'Upload Photo',
        'Select photo source:',
        [
          { text: 'Camera', onPress: () => simulatePhotoUpload() },
          { text: 'Gallery', onPress: () => simulatePhotoUpload() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert('Maximum Reached', 'You have uploaded the maximum number of photos!');
    }
  };

  const simulatePhotoUpload = () => {
    setTimeout(() => {
      setCurrentStep(currentStep + 1);
      Alert.alert('Success', 'Photo uploaded successfully!');
    }, 500);
  };

  const handleContinue = () => {
    if (currentStep >= 1) {
      Alert.alert(
        'Continue',
        'Photos uploaded successfully! Navigate to next screen?',
        [
          { text: 'Stay Here', style: 'cancel' },
          { text: 'Continue', onPress: () => navigation.navigate('addfruit') }
        ]
      );
    } else {
      Alert.alert('Upload Required', 'Please upload at least one photo to continue');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    Alert.alert('Skip', 'Are you sure you want to skip photo upload?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', onPress: () => navigation.goBack() },
    ]);
  };

  // Simple circular progress component
  const CircularProgress = ({ progress, stepText }) => {
    const progressPercentage = (progress / 4) * 100;
    
    return (
      <View style={styles.circularProgressContainer}>
        <View style={styles.progressCircle}>
          <View style={[styles.progressFill, { 
            transform: [{ rotate: `${(progressPercentage / 100) * 360}deg` }]
          }]} />
          <View style={styles.progressInner}>
            <Text style={styles.stepNumberCircular}>{stepText}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPhotoSlot = (index) => {
    const hasPhoto = currentConfig.photos.includes(index + 1);

    return (
      <TouchableOpacity
        key={index}
        style={[styles.photoSlot, hasPhoto && styles.photoSlotFilled]}
        onPress={handlePhotoUpload}
      >
        {hasPhoto ? (
          <View style={styles.photoContainer}>
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoImage} />
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addPhotoContent}>
            <Ionicons name="camera-outline" size={24} color="#999" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>      {/* Content */}
      <View style={styles.content}>
        {/* Demo state cycler for testing */}
        <TouchableOpacity 
          style={styles.demoButton} 
          onPress={() => setCurrentStep((currentStep + 1) % 5)}
        >
          <Text style={styles.demoText}>Demo: Cycle States ({currentStep}/4)</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{currentConfig.title}</Text>
        
        {/* Photo Grid - 2x2 for 4 photos */}
        <View style={styles.photoGrid}>
          <View style={styles.photoRow}>
            {[0, 1].map(renderPhotoSlot)}
          </View>
          <View style={styles.photoRow}>
            {[2, 3].map(renderPhotoSlot)}
          </View>
        </View>
      </View>

      {/* Step Info at Bottom with Circular Progress */}
      <View style={styles.bottomStepInfo}>
        <View style={styles.progressAndText}>
          <CircularProgress progress={currentStep} stepText={currentConfig.stepNumber} />
          <Text style={styles.descriptionBottom}>{currentConfig.description}</Text>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            currentStep < 1 && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={currentStep < 1}
        >
          <Text style={[
            styles.continueButtonText,
            currentStep < 1 && styles.continueButtonTextDisabled
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },  progressContainer: {
    height: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 1.5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00d4aa',
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 15,
  },
  demoText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
  },
  photoGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  photoSlot: {
    width: 120,
    height: 150,
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
  // Bottom step info with circular progress
  bottomStepInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  progressAndText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  circularProgressContainer: {
    marginRight: 15,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#e0e0e0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#00d4aa',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressInner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberCircular: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  descriptionBottom: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
});

export default PhotoUploadScreen;
