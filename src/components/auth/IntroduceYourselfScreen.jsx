// File: src/components/IntroduceYourselfScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { requestImagePickerPermissions } from '../../utils/permissions';
import { authFlowManager } from '../../services/authFlowManager';
import { resetToMain } from '../../navigation/navigationService';
import { syncUserProfile } from '../../services/firebaseService';
import { saveUserRole } from '../../utils/userRoleStorage';
import { useAuthStore } from '../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { pickImageFromGallery, takePhotoWithCamera } from 'utils/ImagePickerHelper';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// Business type options for buyer role
const BUSINESS_TYPE_OPTIONS = [
  { labelKey: 'wholesaler', value: 'wholesaler' },
  { labelKey: 'exporter', value: 'exporter' },
  { labelKey: 'commission_agent', value: 'commission_agent' },
  { labelKey: 'retailer', value: 'retailer' },
  { labelKey: 'transporter', value: 'transporter' }
];

const IntroduceYourselfScreen = ({ navigation, route }) => {
  const { userRole = null, truecallerProfile = null, fromTruecaller = false } = route?.params || {};
  const { t } = useTranslation();
  const authStore = useAuthStore();
  
  // Pre-fill firstName and lastName from Truecaller profile if available
  const [firstName, setFirstName] = useState(truecallerProfile?.firstName || '');
  const [lastName, setLastName] = useState(truecallerProfile?.lastName || '');
  const [profileImage, setProfileImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [businessType, setBusinessType] = useState(null);
  const [businessTypeModalVisible, setBusinessTypeModalVisible] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const lastNameRef = useRef(null);
  const scrollViewRef = useRef(null);
  const firstNameBlockRef = useRef(null);
  const lastNameBlockRef = useRef(null);
  const businessTypeBlockRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const insets = useSafeAreaInsets();

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
    ]).start();

    // Debug Firebase user state
    const checkFirebaseUser = async () => {
      const user = auth().currentUser;
      if (!user) {
        import('../../utils/navigationUtils').then(({ navigateToAuth }) => navigateToAuth());
      }
    };
    checkFirebaseUser();
  }, [fadeAnim, slideAnim, navigation]);

  const handleNext = async () => {
    if (isFormValid) {
      setIsLoading(true);
      setUploadProgress(0);
      setUploadStatus('Preparing...');

      try {
        // Check Firebase user with more detailed logging
        const user = auth().currentUser;

        if (!user) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const userRetry = auth().currentUser;

          if (!userRetry) {
            throw new Error('No authenticated user found. Please sign in again.');
          }
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
            t('alerts.errorTitle'),
            t('auth.intro.roleMissing'),
            [
              {
                text: t('common.goBack'),
                onPress: () => navigation.navigate('RoleSelection')
              }
            ]
          );
          return;
        }

        console.log('📝 Starting profile sync for user:', currentUser.uid);
        console.log('👤 User role selected:', selectedUserRole);
        console.log('👤 User role from route params:', userRole);
        console.log('📷 Has profile image:', !!profileImage);        // Prepare user data
        const userData = {
          uid: currentUser.uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          userRole: selectedUserRole,
          phoneNumber: currentUser.phoneNumber,
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
            Alert.alert(t('auth.intro.syncErrorTitle'), progress.error);
            return;
          }
          // More granular status updates for each backend step
          if (progress.step === 'uploading_avatar') setUploadStatus(t('auth.intro.status.uploadingPhoto'));
          else if (progress.step === 'avatar_complete') setUploadStatus(t('auth.intro.status.photoUploaded'));
          else if (progress.step === 'updating_auth') setUploadStatus(t('auth.intro.status.updatingProfile'));
          else if (progress.step === 'saving_firestore') setUploadStatus(t('auth.intro.status.savingCloud'));
          else if (progress.step === 'saving_local') setUploadStatus(t('auth.intro.status.savingLocal'));
          else if (progress.step === 'complete') setUploadStatus(t('auth.intro.status.complete'));
          else if (progress.progress !== undefined) {
            const percentage = Math.round(progress.progress);
            setUploadProgress(percentage);
            // if (percentage < 100) setUploadStatus(`Uploading ${percentage}%`);
            if (percentage < 100) setUploadStatus(t('auth.intro.status.uploadingGeneric'));
            else setUploadStatus(t('auth.intro.status.finalizing'));
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

        // Save user role to localStorage for immediate availability
        await saveUserRole(selectedUserRole);
        console.log('✅ User role saved to localStorage:', selectedUserRole);

        // Update auth store immediately with the user data
        authStore.updateUser({
          id: currentUser.uid,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phoneNumber,
          userType: selectedUserRole, // 'farmer' | 'buyer'
          status: 'active',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log('🎯 Auth store updated with user role:', selectedUserRole);

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

        // Check if user is buyer to determine next step
        if (selectedUserRole === 'buyer') {
          // For buyers, check if they need fruit selection
          const route = await authFlowManager.resumeAuthFlow();

          if (route.screen === 'FruitsScreen') {
            setUploadStatus('Complete!');
            setIsLoading(false);
            console.log('🍎 Buyer detected - navigating to FruitsScreen');
            navigation.navigate('FruitsScreen', { onboarding: true, mode: 'auth', fromAuth: true });
          } else {
            // Buyer flow complete
            await authFlowManager.updateFlowState('complete');
            setUploadStatus('Complete!');
            setIsLoading(false);
            console.log('✅ Buyer profile complete - navigating to Main');
            resetToMain();
          }
        } else {
          // For farmers, complete auth flow
          await authFlowManager.updateFlowState('complete');
          setUploadStatus('Complete!');
          setIsLoading(false);

          console.log('✅ Farmer profile complete - navigating to Main');
          resetToMain();
        }

        // Don't navigate immediately - let the auth state listener in AppNavigator handle it
        // The auth state will update and AppNavigator will automatically switch to main app

      } catch (error) {
        console.error('❌ Error updating user profile:', error);
        setUploadStatus('Failed');
        setUploadProgress(0);

        Alert.alert(
          t('alerts.errorTitle'),
          error.message || t('auth.intro.saveFailed'),
          [{ text: t('common.ok') }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleImagePicker = async () => {
    setImagePickerModalVisible(true);
  };

  const handleImagePickerOption = async (option) => {
    setImagePickerModalVisible(false);

    // Request permissions first
    const hasPermissions = await requestImagePickerPermissions();
    if (!hasPermissions) {
      return;
    }

    if (option === 'camera') {
      try {
        const image = takePhotoWithCamera({
          cropping: true,
          compressImageQuality: 0.8,
        });

        setProfileImage(image.path);
      } catch (err) {
        console.log('Camera cancelled or failed:', err);
      }
    } else if (option === 'gallery') {
      const image = pickImageFromGallery({
        cropping: true,
        compressImageQuality: 0.8,
      });
      setProfileImage(image.path);
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
    if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
  };
  const handleLastNameChange = (text) => {
    setLastName(text);
    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
  };
  const handleFirstNameSubmit = () => {
    lastNameRef.current?.focus();
  };
  const handleLastNameSubmit = () => {
    Keyboard.dismiss();
    if (isFormValid) handleNext();
  };

  // Ensure field is visible when focusing - dynamic positioning
  const scrollToField = (fieldRef) => {
    fieldRef.current?.measureLayout(
      scrollViewRef.current,
      (x, y) => {
        const availableHeight = screenHeight - keyboardHeight - insets.top - insets.bottom;
        const targetY = Math.max(0, y - availableHeight * 0.3); // Keep field in top 30% of visible area
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      },
      () => { }
    );
  };

  // Keyboard height as shared value for reanimated
  const keyboardHeightAnimated = useSharedValue(0);

  // Keyboard handler
  useKeyboardHandler({
    onStart: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
    onMove: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
    onEnd: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
  });

  // Animated style for the fake view at bottom
  const fakeViewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      height: withTiming(keyboardHeightAnimated.value, { duration: 10 }),
    };
  });

  const onFocusFirstName = () => {
    setTimeout(() => scrollToField(firstNameBlockRef), 100);
  };
  const onFocusLastName = () => {
    setTimeout(() => scrollToField(lastNameBlockRef), 100);
  };
  const onPressBusinessType = () => {
    setTimeout(() => {
      scrollToField(businessTypeBlockRef);
      setTimeout(() => setBusinessTypeModalVisible(true), 200);
    }, 100);
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

  // Dynamic measurements
  const dynamicStyles = {
    scrollContentPadding: Math.max(120, screenHeight * 0.15) + keyboardHeight,
    avatarSize: Math.min(100, screenHeight * 0.12),
    inputHeight: Math.max(56, screenHeight * 0.07),
  };

  const isFormValid = firstName.trim() && lastName.trim() &&
    (userRole !== 'buyer' || (userRole === 'buyer' && businessType));
  return (
    <SafeAreaView
      style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF" />

      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled
          nestedScrollEnabled
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={false}
        >
          <Animated.View
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.heading}>
              {userRole && typeof userRole === 'string' ? t('auth.intro.titleWithRole', { role: t(`roles.${userRole}`) }) : t('auth.intro.title')}
            </Text>
            <Text style={styles.subtext}>
              {t('auth.intro.subtitle')}
            </Text>
            {/* Profile Avatar Section */}
            <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePicker} activeOpacity={0.7}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={[
                    styles.avatarImage,
                    {
                      width: dynamicStyles.avatarSize,
                      height: dynamicStyles.avatarSize,
                      borderRadius: dynamicStyles.avatarSize / 2
                    }
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      width: dynamicStyles.avatarSize,
                      height: dynamicStyles.avatarSize,
                      borderRadius: dynamicStyles.avatarSize / 2
                    }
                  ]}
                >
                  <Ionicons name="camera" size={dynamicStyles.avatarSize * 0.32} color="#007E2F" />
                </View>
              )}
              <Text style={styles.avatarText}>
                {profileImage ? t('auth.intro.changePhoto') : t('auth.intro.addPhoto')}
              </Text>
            </TouchableOpacity>
            {/* Input Fields */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('auth.intro.personalInfo')}</Text>
              {/* First Name Input */}
              <View
                ref={firstNameBlockRef}
                style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}
              >
                <View style={[styles.inputContainer, { minHeight: dynamicStyles.inputHeight }]}>
                  <Text style={[styles.floatingLabel, firstName && styles.floatingLabelActive]}>{t('auth.intro.firstName')}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      firstName && styles.inputWithLabel,
                      { minHeight: dynamicStyles.inputHeight }
                    ]}
                    value={firstName}
                    onChangeText={handleFirstNameChange}
                    onFocus={onFocusFirstName}
                    onSubmitEditing={handleFirstNameSubmit}
                    returnKeyType="next"
                    placeholder=""
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically
                    accessibilityLabel={t('auth.intro.firstName')}
                  />
                </View>
              </View>
              {/* Last Name Input */}
              <View
                ref={lastNameBlockRef}
                style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}
              >
                <View style={[styles.inputContainer, { minHeight: dynamicStyles.inputHeight }]}>
                  <Text style={[styles.floatingLabel, lastName && styles.floatingLabelActive]}>{t('auth.intro.lastName')}</Text>
                  <TextInput
                    ref={lastNameRef}
                    style={[
                      styles.input,
                      lastName && styles.inputWithLabel,
                      { minHeight: dynamicStyles.inputHeight }
                    ]}
                    value={lastName}
                    onChangeText={handleLastNameChange}
                    onFocus={onFocusLastName}
                    onSubmitEditing={handleLastNameSubmit}
                    returnKeyType="done"
                    placeholder=""
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    autoCorrect={false}
                    enablesReturnKeyAutomatically
                    accessibilityLabel={t('auth.intro.lastName')}
                  />
                </View>
              </View>
              {/* Business Type Dropdown - Only show for buyers */}
              {userRole === 'buyer' && (
                <View
                  ref={businessTypeBlockRef}
                  style={[styles.inputWrapper, errors.businessType && styles.inputWrapperError]}
                >
                  <TouchableOpacity
                    style={styles.dropdownContainer}
                    onPress={onPressBusinessType}
                    activeOpacity={0.7}
                    accessibilityLabel="Business Type"
                  >
                    <View style={[styles.inputContainer, { minHeight: dynamicStyles.inputHeight }]}>
                      <Text style={[styles.floatingLabel, businessType && styles.floatingLabelActive]}>{t('auth.intro.businessType')}</Text>
                      <View style={[
                        styles.dropdownDisplay,
                        businessType && styles.inputWithLabel,
                        { minHeight: dynamicStyles.inputHeight }
                      ]}>
                        <Text style={styles.dropdownText}>
                          {businessType ? t(`auth.intro.businessTypes.${BUSINESS_TYPE_OPTIONS.find(option => option.value === businessType)?.labelKey}`) : ''}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
        {/* Next Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.8}
            accessibilityLabel="Continue"
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingText}>{uploadStatus || t('common.loading')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.nextText}>{t('common.next')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fake animated view at bottom to push content up when keyboard opens */}
      <ReAnimated.View style={fakeViewAnimatedStyle} />

      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('auth.intro.help.title')}</Text>
            <Text style={styles.modalText}>
              {t('auth.intro.help.text')}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={imagePickerModalVisible}
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, {
              marginBottom: 20,
            }]}>
              <Text style={styles.modalTitle}>
                {profileImage ? t('auth.intro.changePhoto') : t('auth.intro.addPhoto')}
              </Text>
              <TouchableOpacity
                onPress={() => setImagePickerModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsContainer}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleImagePickerOption('camera')}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="camera" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.modalOptionText}>{t('auth.intro.camera')}</Text>
                <Text style={styles.modalOptionSubtext}>{t('auth.intro.takeNew')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleImagePickerOption('gallery')}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="images" size={25} color="#2196F3" />
                </View>
                <Text style={styles.modalOptionText}>{t('auth.intro.gallery')}</Text>
                <Text style={styles.modalOptionSubtext}>{t('auth.intro.chooseExisting')}</Text>
              </TouchableOpacity>
            </View>

            {profileImage && (
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => {
                  setProfileImage(null);
                  setImagePickerModalVisible(false);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
                <Text style={styles.removePhotoText}>{t('auth.intro.removePhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
            <View style={[styles.modalHeader, {
              paddingTop: 20,
              paddingHorizontal: 16,
            }]}>
              <Text style={styles.modalTitle}>{t('auth.intro.selectBusinessType')}</Text>
              <TouchableOpacity onPress={closeBusinessTypeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={BUSINESS_TYPE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.businessTypeOption,
                    businessType === item.value && styles.businessTypeOptionSelected, index === BUSINESS_TYPE_OPTIONS.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => selectBusinessType(item.value)}
                >
                  <Text style={[
                    styles.businessTypeOptionText,
                    businessType === item.value && styles.businessTypeOptionTextSelected
                  ]}>
                    {t(`auth.intro.businessTypes.${item.labelKey}`)}
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
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Dimensions.get('window').height * 0.03,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: Dimensions.get('window').width * 0.06,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Dimensions.get('window').height * 0.02,
    paddingBottom: Dimensions.get('window').height * 0.025,
    minHeight: Dimensions.get('window').height * 0.08,
  },
  backButton: {
    padding: Dimensions.get('window').width * 0.02,
    borderRadius: Dimensions.get('window').width * 0.05,
    backgroundColor: '#F8F9FA',
  },
  helpButton: {
    padding: Dimensions.get('window').width * 0.02,
    borderRadius: Dimensions.get('window').width * 0.05,
    backgroundColor: '#E8F5E8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Dimensions.get('window').height * 0.13,
  },
  content: {
    alignItems: 'center',
    paddingVertical: Dimensions.get('window').height * 0.025,
  },
  heading: {
    fontSize: Dimensions.get('window').width * 0.06,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: Dimensions.get('window').height * 0.015,
    lineHeight: Dimensions.get('window').width * 0.085,
  },
  subtext: {
    fontSize: Dimensions.get('window').width * 0.04,
    color: '#666666',
    textAlign: 'center',
    marginBottom: Dimensions.get('window').height * 0.04,
    lineHeight: Dimensions.get('window').width * 0.055,
    paddingHorizontal: Dimensions.get('window').width * 0.05,
  }, avatarContainer: {
    alignItems: 'center',
    marginBottom: Dimensions.get('window').height * 0.05,
  },
  avatarCircle: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#007E2F',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Dimensions.get('window').height * 0.015,
  },
  avatarImage: {
    borderWidth: 2,
    borderColor: '#007E2F',
    marginBottom: Dimensions.get('window').height * 0.015,
  },
  avatarText: {
    fontSize: Dimensions.get('window').width * 0.035,
    color: '#007E2F',
    fontWeight: '500',
  },
  inputSection: {
    width: '100%',
    marginBottom: Dimensions.get('window').height * 0.03,
  },
  inputLabel: {
    fontSize: Dimensions.get('window').width * 0.04,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: Dimensions.get('window').height * 0.02,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: Dimensions.get('window').height * 0.025,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: Dimensions.get('window').width * 0.03,
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
    minHeight: Dimensions.get('window').height * 0.07,
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: Dimensions.get('window').width * 0.04,
    top: Dimensions.get('window').height * 0.022,
    fontSize: Dimensions.get('window').width * 0.04,
    color: '#999',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  floatingLabelActive: {
    top: Dimensions.get('window').height * 0.01,
    fontSize: Dimensions.get('window').width * 0.03,
    color: '#007E2F',
    fontWeight: '600',
  },
  input: {
    fontSize: Dimensions.get('window').width * 0.04,
    color: '#1A1A1A',
    paddingHorizontal: Dimensions.get('window').width * 0.04,
    paddingVertical: Dimensions.get('window').height * 0.022,
    fontWeight: '500',
    minHeight: Dimensions.get('window').height * 0.07,
  },
  inputWithLabel: {
    paddingTop: Dimensions.get('window').height * 0.03,
    paddingBottom: Dimensions.get('window').height * 0.015,
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
    left: Dimensions.get('window').width * 0.06,
    right: Dimensions.get('window').width * 0.06,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#007E2F',
    paddingVertical: Dimensions.get('window').height * 0.02,
    borderRadius: Dimensions.get('window').width * 0.04,
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
    fontSize: Dimensions.get('window').width * 0.04,
    fontWeight: '600',
    marginRight: Dimensions.get('window').width * 0.02,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: Dimensions.get('window').width * 0.035,
    fontWeight: '500',
    marginLeft: Dimensions.get('window').width * 0.02,
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
    paddingBottom: 10,
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
    paddingHorizontal: Dimensions.get('window').width * 0.04,
    paddingVertical: Dimensions.get('window').height * 0.022,
    minHeight: Dimensions.get('window').height * 0.07,
  },
  dropdownText: {
    fontSize: Dimensions.get('window').width * 0.04,
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

  // Image Picker Modal styles
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: Dimensions.get('window').width * 0.04,
    color: '#666',
    marginBottom: Dimensions.get('window').height * 0.03,
    lineHeight: Dimensions.get('window').width * 0.055,
  },
  modalOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Dimensions.get('window').width * 0.03,
  },
  modalOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: Dimensions.get('window').width * 0.04,
    backgroundColor: '#F8F9FA',
    borderRadius: Dimensions.get('window').width * 0.04,
    marginBottom: Dimensions.get('window').height * 0.015,
  },
  modalOptionText: {
    fontSize: Dimensions.get('window').width * 0.04,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  modalOptionSubtext: {
    fontSize: Dimensions.get('window').width * 0.033,
    color: '#666',
    textAlign: 'center',
    marginTop: Dimensions.get('window').height * 0.005,
  },
  modalOptionIcon: {
    width: Dimensions.get('window').width * 0.12,
    height: Dimensions.get('window').width * 0.12,
    borderRadius: Dimensions.get('window').width * 0.06,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Dimensions.get('window').height * 0.015,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Dimensions.get('window').height * 0.015,
    paddingHorizontal: Dimensions.get('window').width * 0.04,
    backgroundColor: '#FFEBEE',
    borderRadius: Dimensions.get('window').width * 0.03,
    marginTop: Dimensions.get('window').height * 0.01,
  },
  removePhotoText: {
    fontSize: Dimensions.get('window').width * 0.04,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: Dimensions.get('window').width * 0.02,
  },
});

export default IntroduceYourselfScreen;
