import React, { useState, useEffect, useCallback } from 'react';
import RNBlobUtil from 'react-native-blob-util';
import storage from '@react-native-firebase/storage';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImagePicker from 'react-native-image-crop-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserInFirestore, getUserFromFirestore } from '../../services/firebaseService';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [phoneError, setPhoneError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  const insets = useSafeAreaInsets();

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.trim()) {
      return t('validation.phoneRequired');
    }
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return t('validation.phoneInvalid');
    }
    return '';
  };

  const validateFirstName = (name: string) => {
    if (!name.trim()) {
      return t('validation.firstNameRequired');
    }
    if (name.trim().length < 2) {
      return t('validation.firstNameMin');
    }
    return '';
  };

  const validateLastName = (name: string) => {
    if (!name.trim()) {
      return t('validation.lastNameRequired');
    }
    if (name.trim().length < 2) {
      return t('validation.lastNameMin');
    }
    return '';
  };

  const validateAllFields = () => {
    const phoneErr = validatePhone(phone);
    const firstNameErr = validateFirstName(firstName);
    const lastNameErr = validateLastName(lastName);
    setPhoneError(phoneErr);
    setFirstNameError(firstNameErr);
    setLastNameError(lastNameErr);
    return !phoneErr && !firstNameErr && !lastNameErr;
  };

  // Fetch latest profile from Firestore on mount/focus, like SettingsScreen
  const fetchUserProfile = useCallback(async () => {
    const userDataString = await AsyncStorage.getItem('userData');
    const user = userDataString ? JSON.parse(userDataString) : null;
    setUserData(user);
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      // Remove +91 prefix from phone number if it exists
      const phoneNumber = user.phoneNumber || '';
      const cleanedPhone = phoneNumber.startsWith('+91') ? phoneNumber.substring(3) : phoneNumber;
      setPhone(cleanedPhone);
    }
    if (user?.uid && user?.userRole) {
      try {
        const firestoreUser: any = await getUserFromFirestore(user.uid, user.userRole);
        setProfileImage(firestoreUser?.profileImage || null);
      } catch (err) {
        setProfileImage(null);
      }
    } else {
      setProfileImage(null);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [fetchUserProfile])
  );

  // Pick and compress image
  const pickImage = async () => {

    // For Camera
    // try {
    //   const image = await ImagePicker.openCamera({
    //     width: 400,
    //     height: 400,
    //     cropping: true,
    //     compressImageQuality: 0.8,
    //   });
    //   setProfileImage(image.path);
    // } catch (err) {
    //   console.log('Camera cancelled or failed:', err);
    // }

    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        compressImageQuality: 0.8,
      });
      setProfileImage(image.path);
    } catch (err) {
      console.log('Gallery pick cancelled or failed:', err);
    }
  };


  // Upload and sync profile image (move picked file to cache, delete old after upload)
  const uploadProfileImage = async (pickedFilePath: string, userId: string) => {
    setUploading(true);
    setUploadProgress(0);
    const filename = `profile_${Date.now()}.jpg`;
    const ref = storage().ref(`profiles/${filename}`);
    const task = ref.putFile(pickedFilePath);

    return new Promise<string>(async (resolve, reject) => {
      let oldLocalPath: string | null = null;
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const user = userDataString ? JSON.parse(userDataString) : null;
        oldLocalPath = user?.profileImageLocalPath ? user.profileImageLocalPath : null;
      } catch { }

      task.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          setUploading(false);
          setUploadProgress(0);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await ref.getDownloadURL();
            // Move picked file to cache location
            const localPath = `${RNBlobUtil.fs.dirs.DocumentDir}/profile_${filename}`;
            if (pickedFilePath !== localPath) {
              try {
                await RNBlobUtil.fs.mv(pickedFilePath.replace('file://', ''), localPath);
              } catch (moveErr) {
                // fallback: copy if move fails
                await RNBlobUtil.fs.cp(pickedFilePath.replace('file://', ''), localPath);
              }
            }
            // Delete old cached image if different
            if (oldLocalPath && oldLocalPath !== localPath) {
              try { await RNBlobUtil.fs.unlink(oldLocalPath); } catch { }
            }
            const userDataString = await AsyncStorage.getItem('userData');
            const user = userDataString ? JSON.parse(userDataString) : null;
            const updatedUser = {
              ...user,
              profileImageFirebaseURL: downloadURL,
              profileImageLocalPath: localPath,
              profileImage: downloadURL,
            };
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            setUploading(false);
            setUploadProgress(100);
            resolve(downloadURL);
          } catch (err) {
            setUploading(false);
            setUploadProgress(0);
            reject(err);
          }
        }
      );
    });
  };

  const handleSave = async () => {
    // Validate all fields before saving
    if (!validateAllFields()) {
      Toast.show({
        type: 'error',
        text1: t('validation.title'),
        text2: t('validation.fixBeforeSave'),
        visibilityTime: 2000,
        position: 'bottom',
      });
      return;
    }

    setIsSaving(true);
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      if (!userData?.uid || !userData?.userRole) {
        Alert.alert(t('alerts.errorTitle'), t('alerts.userNotFound'));
        setIsSaving(false);
        return;
      }

      let newProfileImageUrl = userData.profileImage;
      // If a new image was picked, upload and sync
      if (profileImage && !profileImage.startsWith('http')) {
        newProfileImageUrl = await uploadProfileImage(profileImage, userData.uid);
      }

      // Prepare update data
      const updateData = {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        profileImage: newProfileImageUrl || null,
      };

      await updateUserInFirestore(userData.uid, userData.userRole, updateData);

      // Update AsyncStorage with new user data
      await AsyncStorage.setItem(
        'userData',
        JSON.stringify({ ...userData, ...updateData })
      );
      Toast.show({
        type: 'success',
        text1: t('toasts.profileUpdated'),
        visibilityTime: 1200,
        position: 'bottom',
      });
      setIsSaving(false);
      navigation.goBack();
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      setIsSaving(false);
      console.error('Profile update failed:', error);
      Toast.show({
        type: 'error',
        text1: t('toasts.profileUpdateFailed'),
      });
    }
  };


  // --- Use Firestore profile image if available, else fallback ---
  const getProfileImageSource = () => {
    if (profileImage) {
      return { uri: profileImage };
    }
    if (userData?.profileImage) {
      return { uri: userData.profileImage };
    }
    return { uri: 'https://via.placeholder.com/100x100/E2E8F0/64748B?text=Profile' };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#43B86C"

      />
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerBackground}>
          <View style={styles.headerPattern} />
          <View style={styles.headerOverlay} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('settings.editProfileTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('settings.editProfileSubtitle')}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isSaving}
        >
          {/* Profile Image Section */}
          <View style={styles.profileSection}>
            <View style={styles.imageWrapper}>
              <Image
                source={getProfileImageSource()}
                style={styles.profileImage}
              />
              <TouchableOpacity
                style={styles.editIcon}
                onPress={pickImage}
                disabled={isSaving}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              {uploading && (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: -54, alignItems: 'center' }}>
                  <View style={{ width: 100, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${uploadProgress}%`, height: 6, backgroundColor: '#43B86C' }} />
                  </View>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{Math.round(uploadProgress)}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileImageText}>{t('profileEdit.changePhotoHint')}</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profileEdit.firstNameLabel')}</Text>
              <View style={[styles.inputContainer, firstNameError ? styles.inputError : {}]}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (firstNameError) setFirstNameError('');
                  }}
                  placeholder={t('profileEdit.firstNamePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  editable={!isSaving}
                />
              </View>
              {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profileEdit.lastNameLabel')}</Text>
              <View style={[styles.inputContainer, lastNameError ? styles.inputError : {}]}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (lastNameError) setLastNameError('');
                  }}
                  placeholder={t('profileEdit.lastNamePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  editable={!isSaving}
                />
              </View>
              {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profileEdit.phoneLabel')}</Text>
              <View style={[styles.inputContainer, phoneError ? styles.inputError : {}]}>
                <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError('');
                  }}
                  keyboardType="phone-pad"
                  placeholder={t('profileEdit.phonePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  editable={!isSaving}
                />
              </View>
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveText}>{t('profileEdit.saveButton')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full Screen Loading Modal */}
      <Modal
        visible={isSaving}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { }}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#43B86C" style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>{t('profileEdit.savingTitle')}</Text>
            <Text style={styles.loadingSubText}>{t('profileEdit.savingSubtitle')}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerContainer: {
    position: 'relative',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
    opacity: 0.95,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    minHeight: '100%',
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  imageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#E2E8F0',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#43B86C',
    padding: 8,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  profileImageText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Validation error styles
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  // Save button loading styles
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  // Full screen loading overlay styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    minWidth: 200,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
});