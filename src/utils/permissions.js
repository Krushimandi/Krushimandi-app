import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Get Android API level
 */
const getAndroidAPILevel = () => {
  return Platform.OS === 'android' ? Platform.Version : 0;
};

/**
 * Request camera permission for Android
 * @returns {Promise<boolean>} Permission granted status
 */
export const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to camera to take profile pictures.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  }
  return true; // iOS permissions are handled automatically
};

/**
 * Request storage/media permissions for Android (handles different API levels)
 * @returns {Promise<boolean>} Permission granted status
 */
export const requestStoragePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const apiLevel = getAndroidAPILevel();
      
      if (apiLevel >= 33) {
        // Android 13+ (API 33+) - Use granular media permissions
        const mediaPermissions = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ];
        
        const results = await PermissionsAndroid.requestMultiple(mediaPermissions);
        return Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
      } else if (apiLevel >= 23) {
        // Android 6.0+ (API 23+) - Use legacy storage permissions
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to storage to select profile pictures.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Pre Android 6.0 - permissions granted at install time
        return true;
      }
    } catch (err) {
      console.warn('Storage permission error:', err);
      return false;
    }
  }
  return true; // iOS permissions are handled automatically
};

/**
 * Check if all required permissions are granted
 * @returns {Promise<boolean>} All permissions granted status
 */
export const checkImagePickerPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const apiLevel = getAndroidAPILevel();
      
      // Always check camera permission
      const cameraPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      
      let storagePermission = true;
      
      if (apiLevel >= 33) {
        // Android 13+ - Check media permissions
        storagePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
      } else if (apiLevel >= 23) {
        // Android 6.0+ - Check legacy storage permission
        storagePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
      }
      
      return cameraPermission && storagePermission;
    } catch (err) {
      console.warn('Permission check error:', err);
      return false;
    }
  }
  return true; // iOS permissions are handled automatically
};

/**
 * Request all required permissions for image picker
 * @returns {Promise<boolean>} All permissions granted status
 */
export const requestImagePickerPermissions = async () => {
  try {
    console.log('Requesting image picker permissions...');
    
    const cameraGranted = await requestCameraPermission();
    console.log('Camera permission granted:', cameraGranted);
    
    const storageGranted = await requestStoragePermission();
    console.log('Storage permission granted:', storageGranted);
    
    if (!cameraGranted || !storageGranted) {
      Alert.alert(
        'Permissions Required',
        'Camera and storage permissions are required to upload profile pictures. Please enable them in app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              // You can add logic to open app settings here
              console.log('Opening app settings...');
            }
          }
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    Alert.alert(
      'Permission Error',
      'There was an error requesting permissions. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Check and request permissions if needed
 * @returns {Promise<boolean>} Permissions granted status
 */
export const ensureImagePickerPermissions = async () => {
  const hasPermissions = await checkImagePickerPermissions();
  if (hasPermissions) {
    console.log('Image picker permissions already granted');
    return true;
  }
  
  console.log('Requesting image picker permissions...');
  return await requestImagePickerPermissions();
};
