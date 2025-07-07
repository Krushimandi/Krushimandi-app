/**
 * Permission utilities for React Native app
 * 
 * This file provides centralized permission handling for:
 * - Camera permissions (for profile pictures and photo uploads)
 * - Storage/Media permissions (for selecting images from gallery)
 * - Location permissions (for auto-filling farm location details)
 * 
 * Usage Examples:
 * 
 * // For location services:
 * import { getCurrentLocation, reverseGeocode, checkLocationPermission } from '../utils/permissions';
 * 
 * const location = await getCurrentLocation();
 * const locationDetails = await reverseGeocode(lat, lng);
 * 
 * // For image picker:
 * import { ensureImagePickerPermissions } from '../utils/permissions';
 * 
 * const hasPermissions = await ensureImagePickerPermissions();
 * if (hasPermissions) {
 *   // Proceed with image picker
 * }
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache for location data to avoid repeated API calls
const LOCATION_CACHE_KEY = 'cached_location_data';
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const SIGNIFICANT_DISTANCE = 0.001; // ~100 meters (0.001 degrees ≈ 111 meters)

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

/**
 * Request location permission for Android and iOS
 * @returns {Promise<boolean>} Permission granted status
 */
export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      // First check if permission is already granted
      const checkPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      if (checkPermission) {
        return true;
      }

      // Request permission if not already granted
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message: 'This app needs access to your location to auto-fill farm details and help buyers find your produce.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      
      console.log('Location permission result:', granted);
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert(
          'Permission Denied', 
          'Location permission was denied. You can enable it later in Settings to auto-fill farm details.',
          [{ text: 'OK' }]
        );
        return false;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Location permission is permanently denied. Please enable it in Settings > Apps > MyApp > Permissions to use auto-location feature.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return false;
    } catch (err) {
      console.error('Location permission request error:', err);
      Alert.alert(
        'Permission Error', 
        'Unable to request location permission. Please enable location manually in settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } else {
    // iOS - request authorization
    try {
      Geolocation.requestAuthorization();
      return true;
    } catch (error) {
      console.error('iOS location permission error:', error);
      return false;
    }
  }
};

/**
 * Check if location permission is granted
 * @returns {Promise<boolean>} Permission granted status
 */
export const checkLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    } catch (err) {
      console.warn('Location permission check error:', err);
      return false;
    }
  }
  return true; // iOS permissions are handled by the system
};

/**
 * Get current device location quickly with lower accuracy (for faster response)
 * @returns {Promise<{latitude: number, longitude: number} | null>} Location coordinates or null
 */
export const getQuickLocation = async () => {
  return getCurrentLocation({
    enableHighAccuracy: false,
    timeout: 8000, // Faster timeout
    maximumAge: 120000 // Allow older cached location (2 minutes)
  });
};

/**
 * Get current device location with proper permission handling and smart fallbacks
 * Prioritizes Network/WiFi/Cell Tower location for speed
 * @param {object} options - Configuration options for location request
 * @returns {Promise<{latitude: number, longitude: number} | null>} Location coordinates or null
 */
export const getCurrentLocation = async (options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: false, // Start with network-based location for speed
    timeout: 4000, // Fast network location - 4 seconds
    maximumAge: 60000, // Allow cached location up to 1 minute old for speed
    showLocationDialog: true,
    forceRequestLocation: true,
    ...options
  };

  return new Promise(async (resolve, reject) => {
    try {
      // Check and request permission first
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        reject(new Error('Location permission not granted'));
        return;
      }

      console.log('Permission granted, getting location with network priority...');
      
      // First attempt: Network/WiFi/Cell Tower location (fast and works indoors)
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('Network location obtained:', position.coords);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'Network'
          });
        },
        (error) => {
          console.warn('Network location failed, trying GPS...', error);
          
          // Second attempt: High accuracy GPS (outdoor use)
          Geolocation.getCurrentPosition(
            (position) => {
              console.log('GPS location obtained:', position.coords);
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                source: 'GPS'
              });
            },
            (fallbackError) => {
              console.warn('GPS also failed, trying last chance...', fallbackError);
              
              // Third attempt: Any available location (very permissive)
              Geolocation.getCurrentPosition(
                (position) => {
                  console.log('Last chance location obtained:', position.coords);
                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    source: 'LastChance',
                    fallback: true
                  });
                },
                (finalError) => {
                  console.error('All location attempts failed:', finalError);
                  
                  let errorMessage = 'Unable to get your current location.';
                  let userFriendlyMessage = '';
                  
                  switch (finalError.code) {
                    case 1: // PERMISSION_DENIED
                      errorMessage = 'Location access denied. Please enable location permissions in settings.';
                      userFriendlyMessage = 'Please enable location permissions in your device settings.';
                      break;
                    case 2: // POSITION_UNAVAILABLE
                      errorMessage = 'Location not available. Please check your GPS or internet connection.';
                      userFriendlyMessage = 'Make sure GPS is enabled or you have internet connection for WiFi location.';
                      break;
                    case 3: // TIMEOUT
                      errorMessage = 'Location request timed out. Poor signal quality.';
                      userFriendlyMessage = 'Location services are responding slowly. Try moving to an area with better signal.';
                      break;
                    default:
                      errorMessage = 'Location services unavailable.';
                      userFriendlyMessage = 'Location services are not working properly. Please try again or fill details manually.';
                  }
                  
                  const err = new Error(errorMessage);
                  err.userMessage = userFriendlyMessage;
                  err.code = finalError.code;
                  reject(err);
                },
                {
                  // Last chance: Very permissive settings
                  enableHighAccuracy: false,
                  timeout: 3000, // Quick timeout
                  maximumAge: 300000, // Accept even 5 minute old location
                  showLocationDialog: false
                }
              );
            },
            {
              // GPS fallback: Higher accuracy but slower
              enableHighAccuracy: true,
              timeout: 6000, // GPS timeout
              maximumAge: 120000, // Accept 2 minute old GPS location
              showLocationDialog: true
            }
          );
        },
        defaultOptions
      );
    } catch (error) {
      console.error('Location function error:', error);
      const err = new Error('Something went wrong while getting your location.');
      err.userMessage = 'There was a technical error. Please try again or fill location details manually.';
      reject(err);
    }
  });
};

/**
 * Reverse geocode coordinates to get location details with Google Geocoding API first, then fallback APIs
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object | null>} Location data or null
 */
/**
 * Calculate distance between two coordinates in degrees
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in degrees
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

/**
 * Get cached location data if available and valid
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object | null>} Cached location data or null
 */
const getCachedLocationData = async (latitude, longitude) => {
  try {
    const cachedData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cachedData) return null;

    const parsed = JSON.parse(cachedData);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > CACHE_EXPIRY_TIME) {
      console.log('Cache expired, removing...');
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    
    // Check if location has moved significantly
    const distance = calculateDistance(latitude, longitude, parsed.latitude, parsed.longitude);
    if (distance > SIGNIFICANT_DISTANCE) {
      console.log('Location moved significantly, cache invalid');
      return null;
    }
    
    console.log('Using cached location data:', parsed.locationData);
    return { ...parsed.locationData, source: 'cache' };
  } catch (error) {
    console.warn('Error reading cache:', error);
    return null;
  }
};

/**
 * Cache location data for future use
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {object} locationData 
 */
const cacheLocationData = async (latitude, longitude, locationData) => {
  try {
    const cacheData = {
      latitude,
      longitude,
      locationData,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    console.log('Location data cached successfully');
  } catch (error) {
    console.warn('Error caching location data:', error);
  }
};

/**
 * Fast reverse geocoding using Google Geocoding API with smart caching
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object | null>} Location data or null
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`Getting location for: ${latitude}, ${longitude}`);
    
    // First check cache
    const cachedData = await getCachedLocationData(latitude, longitude);
    if (cachedData) {
      return cachedData;
    }
    
    // Use Google Geocoding API with fast timeout
    const googleApiKey = 'AIzaSyA7N1JXTOsM60RFRrCohYhm_2ZZp4Q0B3o';
    
    // Create timeout for very fast response (2 seconds max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Location timeout')), 2000);
    });
    
    const googlePromise = fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}&language=en&region=IN`
    );
    
    const googleResponse = await Promise.race([googlePromise, timeoutPromise]);
    const googleData = await googleResponse.json();
    
    console.log('Google Geocoding response:', JSON.stringify(googleData, null, 2));
    
    if (googleData.status === 'OK' && googleData.results.length > 0) {
      const result = googleData.results[0];
      const components = result.address_components;
      
      // Extract address components efficiently
      let village = '';
      let district = '';
      let state = '';
      let pincode = '';
      
      components.forEach(component => {
        const types = component.types;
        
        // For village: prioritize sublocality > neighborhood > locality
        if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
          if (!village) village = component.long_name;
        } else if (types.includes('locality')) {
          // Use locality as village if no sublocality found, OR as district if village already set
          if (!village) {
            village = component.long_name;
          } else if (!district) {
            district = component.long_name;
          }
        } else if (types.includes('administrative_area_level_2')) {
          district = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        } else if (types.includes('postal_code')) {
          pincode = component.long_name;
        }
      });
      
      // If village is still empty, use the first part of formatted address
      if (!village && result.formatted_address) {
        const addressParts = result.formatted_address.split(',');
        if (addressParts.length > 0) {
          village = addressParts[0].trim();
        }
      }
      
      // Ensure we have village (fill with city if needed)
      if (!village && district) {
        village = district;
      }
      
      const locationData = {
        village: village || '',
        district: district || village || '',
        state: state || '',
        pincode: pincode || ''
      };
      
      console.log('Location data:', locationData);
      
      // Cache the result for future use
      if (locationData.state && locationData.village) {
        await cacheLocationData(latitude, longitude, locationData);
        return { ...locationData, source: 'google' };
      }
    } else {
      console.warn('Google Geocoding API returned:', googleData.status, googleData.error_message);
    }
    
    // Return null if failed
    return null;
    
  } catch (error) {
    console.warn('Location detection failed:', error.message);
    return null;
  }
};

/**
 * Get location with super fast response - tries cache first, then Google API, then basic fallback
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>} Location data with fallback
 */
export const getFastLocation = async (latitude, longitude) => {
  try {
    // Try cached data first for instant response
    const cachedData = await getCachedLocationData(latitude, longitude);
    if (cachedData) {
      console.log('Using cached location data for instant response');
      return cachedData;
    }
    
    // Try Google API with fast timeout
    const result = await reverseGeocode(latitude, longitude);
    if (result) {
      return result;
    }
    
    // If Google fails, provide basic fallback location
    console.log('Google API failed, using basic fallback');
    const fallbackData = {
      village: 'Current Location',
      district: 'Unknown District',
      state: 'India',
      pincode: '',
      source: 'fallback'
    };
    
    // Cache the fallback data temporarily (shorter expiry)
    await cacheLocationData(latitude, longitude, fallbackData);
    return fallbackData;
  } catch (error) {
    console.warn('Fast location failed:', error);
    // Return basic location data as absolute fallback
    return {
      village: 'Current Location',
      district: 'Unknown District', 
      state: 'India',
      pincode: '',
      source: 'fallback'
    };
  }
};

/**
 * Get location using Google Geocoding API only - fast and simple
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>} Location data
 */
export const getDetailedLocation = async (latitude, longitude) => {
  // Use the same function as reverseGeocode for consistency
  return await reverseGeocode(latitude, longitude);
};
