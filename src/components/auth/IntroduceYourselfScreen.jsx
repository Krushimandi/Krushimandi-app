// File: src/components/IntroduceYourselfScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
import { requestImagePickerPermissions } from '../../utils/permissions';
import { setAuthStep } from '../../utils/authFlow';
import { syncUserProfile } from '../../services/firebaseService';

// Business type options for buyer role
const BUSINESS_TYPE_OPTIONS = [
  { label: 'Wholesaler', value: 'wholesaler' },
  { label: 'Exporter', value: 'exporter' },
  { label: 'Commission Agent', value: 'commission_agent' },
  { label: 'Retailer', value: 'retailer' },
  { label: 'Transporter', value: 'transporter' }
];

const IntroduceYourselfScreen = ({ navigation, route }) => {
  const { userRole = null } = route?.params || {}; const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [businessType, setBusinessType] = useState(null);
  const [businessTypeModalVisible, setBusinessTypeModalVisible] = useState(false);
  const lastNameRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();    // Debug Firebase user state
    const checkFirebaseUser = async () => {
      console.log('🔍 IntroduceYourselfScreen - Starting Firebase user check...');

      // Check current Firebase user
      const user = auth().currentUser;

      if (!user) {
        console.error('❌ No Firebase user found!');
        Alert.alert(
          'Authentication Error',
          'Your session has expired. Please sign in again.',
          [
            {              text: 'OK',
              onPress: () => {
                import('../../utils/navigationUtils').then(
                  ({ navigateToAuth }) => navigateToAuth()
                );
              },
            }
          ]
        );
      } else {
        console.log('✅ Firebase user confirmed:', user.uid);
      }
    };

    checkFirebaseUser();

    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Keyboard is shown
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Keyboard is hidden
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [fadeAnim, slideAnim, navigation]);

  // Firebase Storage upload function - temporarily commented out
  /*
  const uploadImageToFirebase = async (imageUri, userId) => {
    try {
      const filename = `profile_images/${userId}_${Date.now()}.jpg`;
      const reference = storage().ref(filename);
      await reference.putFile(imageUri);
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };
  */  const handleNext = async () => {
    if (isFormValid) {
      setIsLoading(true);
      setUploadProgress(0);
      setUploadStatus('Preparing...');

      try {
        // Check Firebase user with more detailed logging
        const user = auth().currentUser;
        console.log('🔍 Starting handleNext - Firebase User Check:', {
          userExists: !!user,
          uid: user?.uid,
          phoneNumber: user?.phoneNumber,
          displayName: user?.displayName,
          isAnonymous: user?.isAnonymous,
          emailVerified: user?.emailVerified
        });

        if (!user) {
          console.error('❌ No authenticated user found in handleNext');

          // Try to wait a moment and check again (Firebase might be updating)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const userRetry = auth().currentUser;

          if (!userRetry) {
            throw new Error('No authenticated user found. Please sign in again.');
          }

          console.log('✅ Found user on retry:', userRetry.uid);
        }

        const currentUser = user || auth().currentUser;

        // Get user role from params or AsyncStorage
        let selectedUserRole = userRole;
        if (!selectedUserRole) {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsedData = JSON.parse(userData);
            selectedUserRole = parsedData.userRole;
          }
        }

        if (!selectedUserRole) {
          console.error('❌ No user role found');
          Alert.alert(
            'Error',
            'User role not found. Please select your role again.',
            [
              {
                text: 'Go Back',
                onPress: () => navigation.navigate('RoleSelection')
              }
            ]
          );
          return;
        }

        console.log('📝 Starting profile sync for user:', currentUser.uid);
        console.log('👤 User role:', selectedUserRole);
        console.log('📷 Has profile image:', !!profileImage);        // Prepare user data
        const userData = {
          uid: currentUser.uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          userRole: selectedUserRole,
          phoneNumber: currentUser.phoneNumber,
          email: currentUser.email || '',
          isProfileComplete: true,
        };

        // Add businessType for buyers
        if (selectedUserRole === 'buyer' && businessType) {
          userData.businessType = businessType;
        }

        // Progress callback for upload
        const progressCallback = (progress) => {
          if (progress.error) {
            setUploadStatus('Upload failed');
            setUploadProgress(0);
            Alert.alert('Sync Error', progress.error);
            return;
          }
          // More granular status updates for each backend step
          if (progress.step === 'uploading_avatar') setUploadStatus('Uploading photo...');
          else if (progress.step === 'avatar_complete') setUploadStatus('Photo uploaded!');
          else if (progress.step === 'updating_auth') setUploadStatus('Updating profile...');
          else if (progress.step === 'saving_firestore') setUploadStatus('Saving to cloud...');
          else if (progress.step === 'saving_local') setUploadStatus('Saving locally...');
          else if (progress.step === 'complete') setUploadStatus('Complete!');
          else if (progress.progress !== undefined) {
            const percentage = Math.round(progress.progress);
            setUploadProgress(percentage);
            if (percentage < 100) setUploadStatus(`Uploading ${percentage}%`);
            else setUploadStatus('Finalizing...');
          }
        };

        // Use syncUserProfile from firebaseService
        await syncUserProfile(
          { ...userData, avatar: profileImage },
          (progress) => {
            if (progress.error) {
              setUploadStatus('Upload failed');
              setUploadProgress(0);
              Alert.alert('Sync Error', progress.error);
              return;
            }
            // More granular status updates for each backend step
            if (progress.step === 'uploading_avatar') setUploadStatus('Uploading photo...');
            else if (progress.step === 'avatar_complete') setUploadStatus('Photo uploaded!');
            else if (progress.step === 'updating_auth') setUploadStatus('Updating profile...');
            else if (progress.step === 'saving_firestore') setUploadStatus('Saving to cloud...');
            else if (progress.step === 'saving_local') setUploadStatus('Saving locally...');
            else if (progress.step === 'complete') setUploadStatus('Complete!');
            else if (progress.progress !== undefined) {
              const percentage = Math.round(progress.progress);
              setUploadProgress(percentage);
              if (percentage < 100) setUploadStatus(`Uploading ${percentage}%`);
              else setUploadStatus('Finalizing...');
            }
          }
        );

        console.log('✅ Profile sync completed successfully');

        // Store profile completion in AsyncStorage as well for persistence
        try {
          const existingUserData = await AsyncStorage.getItem('userData');
          let updatedUserData = userData;
          
          if (existingUserData) {
            const parsed = JSON.parse(existingUserData);
            updatedUserData = { ...parsed, ...userData };
          }
          
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          console.log('✅ Profile data persisted to AsyncStorage');
        } catch (storageError) {
          console.warn('⚠️ Failed to persist profile data to AsyncStorage:', storageError);
        }

        // Mark auth as complete
        await setAuthStep('Complete');
        setUploadStatus('Complete!');
        
        console.log('✅ Auth step set to Complete - AppNavigator should handle navigation automatically');
        
        // Give the auth state manager a moment to process and trigger navigation
        setTimeout(() => {
          if (isLoading) {
            console.log('🔄 Navigation should have occurred, clearing loading state');
            setIsLoading(false);
          }
        }, 2000); // Clear loading after 2 seconds as fallback
        
        // Don't navigate immediately - let the auth state listener in AppNavigator handle it
        // The auth state will update and AppNavigator will automatically switch to main app

      } catch (error) {
        console.error('❌ Error updating user profile:', error);
        setUploadStatus('Failed');
        setUploadProgress(0);

        Alert.alert(
          'Error',
          error.message || 'Failed to save user information. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleImagePicker = async () => {
    // Request permissions first
    const hasPermissions = await requestImagePickerPermissions();
    if (!hasPermissions) {
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 400,
      maxWidth: 400,
      quality: 0.7,
    };

    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to add your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => launchCamera(options, handleImageResponse)
        },
        {
          text: 'Gallery',
          onPress: () => launchImageLibrary(options, handleImageResponse)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  const handleImageResponse = (response) => {
    console.log('Image picker response:', response);

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
      setProfileImage(imageUri);
    } else {
      console.log('No image selected');
      Alert.alert('Error', 'No image was selected. Please try again.');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const showHelp = () => {
    setModalVisible(true);
  };
  const handleFirstNameChange = (text) => {
    setFirstName(text);
    if (errors.firstName) {
      setErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (text) => {
    setLastName(text);
    if (errors.lastName) {
      setErrors(prev => ({ ...prev, lastName: '' }));
    }
  }; const handleFirstNameSubmit = () => {
    if (lastNameRef.current) {
      lastNameRef.current.focus();
    }
  };
  const handleLastNameSubmit = () => {
    Keyboard.dismiss();
    if (isFormValid) {
      handleNext();
    }
  };

  const openBusinessTypeModal = () => {
    setBusinessTypeModalVisible(true);
  };

  const closeBusinessTypeModal = () => {
    setBusinessTypeModalVisible(false);
  };

  const selectBusinessType = (type) => {
    setBusinessType(type);
    if (errors.businessType) {
      setErrors(prev => ({ ...prev, businessType: '' }));
    }
    closeBusinessTypeModal();
  };

  const isFormValid = firstName.trim() && lastName.trim() &&
    (userRole !== 'buyer' || (userRole === 'buyer' && businessType));
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        enabled={true}
      >
        <View style={styles.innerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
            </TouchableOpacity>
          </View>          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={false}
          ><Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }]}
          >              <Text style={styles.heading}>
                {userRole && typeof userRole === 'string' ? `Introduce yourself as a ${userRole}` : 'Introduce yourself'}
              </Text>
              <Text style={styles.subtext}>
                Help us personalize your experience by sharing your name
              </Text>              {/* Profile Avatar Section */}
              <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePicker}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Ionicons name="camera" size={32} color="#007E2F" />
                  </View>
                )}
                <Text style={styles.avatarText}>
                  {profileImage ? 'Change Profile Photo' : 'Add Profile Photo'}
                </Text>
              </TouchableOpacity>

              {/* Input Fields */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Personal Information</Text>

                {/* First Name Input */}
                <View style={[
                  styles.inputWrapper,
                  errors.firstName && styles.inputWrapperError
                ]}>
                  <View style={styles.inputContainer}>
                    <Text style={[
                      styles.floatingLabel,
                      firstName && styles.floatingLabelActive]}>
                      First Name
                    </Text>
                    <TextInput
                      style={[styles.input, firstName && styles.inputWithLabel]}
                      value={firstName}
                      onChangeText={handleFirstNameChange}
                      onSubmitEditing={handleFirstNameSubmit}
                      returnKeyType="next"
                      placeholder=""
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      autoCorrect={false}
                      blurOnSubmit={false}
                      enablesReturnKeyAutomatically={true}
                    />
                  </View>
                </View>

                {/* Last Name Input */}
                <View style={[
                  styles.inputWrapper,
                  errors.lastName && styles.inputWrapperError
                ]}>
                  <View style={styles.inputContainer}>
                    <Text style={[
                      styles.floatingLabel,
                      lastName && styles.floatingLabelActive
                    ]}>Last Name</Text>
                    <TextInput
                      ref={lastNameRef}
                      style={[styles.input, lastName && styles.inputWithLabel]}
                      value={lastName}
                      onChangeText={handleLastNameChange}
                      onSubmitEditing={handleLastNameSubmit}
                      returnKeyType="done"
                      placeholder=""
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      autoCorrect={false}
                      blurOnSubmit={true}
                      enablesReturnKeyAutomatically={true} />                  </View>                </View>

                {/* Business Type Dropdown - Only show for buyers */}
                {userRole === 'buyer' && (
                  <View style={[
                    styles.inputWrapper,
                    errors.businessType && styles.inputWrapperError
                  ]}>
                    <TouchableOpacity
                      style={styles.dropdownContainer}
                      onPress={openBusinessTypeModal}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inputContainer}>
                        <Text style={[
                          styles.floatingLabel,
                          businessType && styles.floatingLabelActive
                        ]}>
                          Business Type
                        </Text>
                        <View style={[styles.dropdownDisplay, businessType && styles.inputWithLabel]}>
                          <Text style={styles.dropdownText}>
                            {businessType ?
                              BUSINESS_TYPE_OPTIONS.find(option => option.value === businessType)?.label
                              : ''}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>


            </Animated.View>
          </ScrollView>          {/* Next Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.loadingText}>
                    {uploadStatus || 'Processing...'}
                  </Text>
                 {/* uploadProgress > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${uploadProgress}%` }
                          ]}
                        />
                      </View>
                    </View>
                  ) */}
                  
                </View>
              ) : (
                <>
                  <Text style={styles.nextText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>      {/* Help Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Need Help?</Text>
            <Text style={styles.modalText}>
              Enter your first and last name as you'd like them to appear in your profile. You can change this later in settings.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Business Type Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={businessTypeModalVisible}
        onRequestClose={closeBusinessTypeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeBusinessTypeModal}>
          <View style={[styles.modalContent, styles.businessTypeModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business Type</Text>
              <TouchableOpacity onPress={closeBusinessTypeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={BUSINESS_TYPE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.businessTypeOption,
                    businessType === item.value && styles.businessTypeOptionSelected
                  ]}
                  onPress={() => selectBusinessType(item.value)}
                >
                  <Text style={[
                    styles.businessTypeOptionText,
                    businessType === item.value && styles.businessTypeOptionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {businessType === item.value && (
                    <Ionicons name="checkmark" size={20} color="#007E2F" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.businessTypeList}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 180,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  }, avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#007E2F',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#007E2F',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 14,
    color: '#007E2F',
    fontWeight: '500',
  },
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  inputWrapperFocused: {
    borderColor: '#007E2F',
    backgroundColor: '#FFFFFF',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#FF3547',
    backgroundColor: '#FFF5F5',
  },
  inputContainer: {
    position: 'relative',
    minHeight: 56,
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 18,
    fontSize: 16,
    color: '#999',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  floatingLabelActive: {
    top: 8,
    fontSize: 12,
    color: '#007E2F',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontWeight: '500',
    minHeight: 56,
  },
  inputWithLabel: {
    paddingTop: 24,
    paddingBottom: 12,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  }, nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  progressContainer: {
    marginLeft: 12,
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  }, modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Business Type Dropdown styles
  dropdownContainer: {
    width: '100%',
  },
  dropdownDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  businessTypeModalContent: {
    maxHeight: '60%',
    width: '90%',
    borderRadius: 16,
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  businessTypeList: {
    width: '100%',
  },
  businessTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  businessTypeOptionSelected: {
    backgroundColor: '#E8F5E8',
  },
  businessTypeOptionText: {
    fontSize: 16,
    color: '#333333',
  },
  businessTypeOptionTextSelected: {
    color: '#007E2F',
    fontWeight: '600',
  },
});

export default IntroduceYourselfScreen;
