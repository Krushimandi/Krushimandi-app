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
import { GOOGLE_MAPS_API_KEY } from '../config';

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
    maximumAge: 120000 // Allow older location (2 minutes)
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
    maximumAge: 60000, // Allow location up to 1 minute old for speed
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
 * Reverse geocode coordinates to get accurate location details with enhanced Google Geocoding API
 * Returns structured data: City/Village, District, State, Pincode
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object | null>} Location data or null
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`🗺️ Getting accurate location for: ${latitude}, ${longitude}`);

    // Enhanced timeout for better accuracy (3 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Location timeout')), 3000);
    });

    // Enhanced API call with all possible result types for maximum granular detail
    const googlePromise = fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=en&region=IN&result_type=street_address|route|intersection|political|country|administrative_area_level_1|administrative_area_level_2|administrative_area_level_3|colloquial_area|locality|sublocality|neighborhood|premise|subpremise|postal_code|natural_feature|airport|park|point_of_interest`
    );

    const googleResponse = await Promise.race([googlePromise, timeoutPromise]);
    
    if (!googleResponse.ok) {
      throw new Error(`Google API HTTP error: ${googleResponse.status}`);
    }

    const googleData = await googleResponse.json();
    console.log('🌐 Google Geocoding response status:', googleData.status);

    if (googleData.status === 'OK' && googleData.results.length > 0) {
      // Process multiple results to get the most accurate data
      let bestResult = null;
      let city = '';
      let district = '';
      let state = '';
      let pincode = '';

      // Try to find the best result with most complete information
      for (const result of googleData.results) {
        const components = result.address_components;
        let tempCity = '';
        let tempDistrict = '';
        let tempState = '';
        let tempPincode = '';

        components.forEach(component => {
          const types = component.types;
          const longName = component.long_name;

          // Enhanced city/village detection with granular priority system
          // Priority: sublocality_level_3 > sublocality_level_2 > sublocality_level_1 > neighborhood > route > locality
          if (types.includes('sublocality_level_2')) {
            // Most specific area/neighborhood (e.g., "Satav Nagar")
            if (!tempCity) tempCity = longName;
          }
          else if (types.includes('sublocality_level_1')) {
            // Sub-area within locality (e.g., "Hadapsar")
            if (!tempCity) {
              tempCity = longName;
            } else {
              // Combine with existing for more detail (e.g., "Satav Nagar, Hadapsar")
              tempCity = `${tempCity}, ${longName}`;
            }
          }
          else if (types.includes('sublocality_level_1')) {
            // Broader sub-locality
            if (!tempCity) {
              tempCity = longName;
            } else if (!tempCity.includes(longName)) {
              tempCity = `${tempCity}, ${longName}`;
            }
          }
          else if (types.includes('neighborhood')) {
            // Neighborhood level
            if (!tempCity) {
              tempCity = longName;
            } else if (!tempCity.includes(longName)) {
              tempCity = `${tempCity}, ${longName}`;
            }
          }
          else if (types.includes('route')) {
            // Street/road level - only if no other city info
            if (!tempCity) tempCity = longName;
          }
          else if (types.includes('locality')) {
            // This would be "Pune" - use as district if tempCity already has specific area
            if (tempCity && !tempDistrict) {
              tempDistrict = longName; // "Pune" becomes district
            } else if (!tempCity) {
              tempCity = longName; // Fallback if no specific area found
            }
          }

          // Enhanced district detection - prefer locality over administrative_area_level_2 for Indian cities
          if (types.includes('locality') && !tempDistrict) {
            tempDistrict = longName; // "Pune" as district
          }
          else if (types.includes('administrative_area_level_2') && !tempDistrict) {
            tempDistrict = longName; // Fallback to admin level 2
          }

          // State detection
          if (types.includes('administrative_area_level_1')) {
            if (!tempState) tempState = longName;
          }

          // Pincode detection
          if (types.includes('postal_code')) {
            if (!tempPincode) tempPincode = longName;
          }
        });

        // Use this result if it has more complete information
        if (tempCity && tempState && (!bestResult || (tempDistrict && tempPincode))) {
          city = tempCity;
          district = tempDistrict;
          state = tempState;
          pincode = tempPincode;
          bestResult = result;
        }
      }

      // Fallback logic if we don't have complete data from any single result
      if (!city || !district || !state) {
        console.log('🔄 Using enhanced fallback logic to complete address...');
        
        // Combine data from all results with priority for granular location
        let fallbackCity = '';
        let fallbackDistrict = '';
        let fallbackState = '';
        let fallbackPincode = '';

        googleData.results.forEach(result => {
          result.address_components.forEach(component => {
            const types = component.types;
            const longName = component.long_name;

            // Enhanced fallback for city/village with granular details
            if (!fallbackCity) {
              if (types.includes('sublocality_level_3') || types.includes('sublocality_level_2') || types.includes('sublocality_level_1')) {
                fallbackCity = longName;
              } else if (types.includes('neighborhood')) {
                fallbackCity = longName;
              } else if (types.includes('route')) {
                fallbackCity = longName;
              }
            } else {
              // Add additional locality details if they're more specific
              if (types.includes('sublocality_level_3') || types.includes('sublocality_level_2')) {
                if (!fallbackCity.includes(longName)) {
                  fallbackCity = `${longName}, ${fallbackCity}`;
                }
              }
            }

            // Fallback for district - prefer locality over administrative levels
            if (!fallbackDistrict) {
              if (types.includes('locality')) {
                fallbackDistrict = longName;
              } else if (types.includes('administrative_area_level_2')) {
                fallbackDistrict = longName;
              }
            }

            if (!fallbackState && types.includes('administrative_area_level_1')) {
              fallbackState = longName;
            }
            if (!fallbackPincode && types.includes('postal_code')) {
              fallbackPincode = longName;
            }
          });
        });

        // Use fallback data if original data is incomplete
        if (!city) city = fallbackCity;
        if (!district) district = fallbackDistrict;
        if (!state) state = fallbackState;
        if (!pincode) pincode = fallbackPincode;
      }

      // Final fallback: intelligently parse formatted address for granular location
      if (!city && bestResult?.formatted_address) {
        const addressParts = bestResult.formatted_address.split(',');
        if (addressParts.length > 0) {
          // Take the first part as it's usually the most specific location
          const firstPart = addressParts[0].trim();
          
          // If we have multiple address parts, try to combine first two for more context
          if (addressParts.length > 1 && firstPart.length < 20) {
            const secondPart = addressParts[1].trim();
            // Avoid duplicating district names
            if (secondPart !== district && !secondPart.toLowerCase().includes('division')) {
              city = `${firstPart}, ${secondPart}`;
            } else {
              city = firstPart;
            }
          } else {
            city = firstPart;
          }
        }
      }

      // Enhanced smart fallback logic for missing components
      if (!city && district) {
        city = district; // Use district as city if city is missing
      }
      if (!district && city) {
        // If city contains comma, extract district from the latter part
        if (city.includes(',')) {
          const parts = city.split(',');
          const lastPart = parts[parts.length - 1].trim();
          // Check if last part could be district (not too generic)
          if (lastPart.length > 3 && !lastPart.toLowerCase().includes('nagar') && !lastPart.toLowerCase().includes('road')) {
            district = lastPart;
          } else {
            district = city; // Use full city as district
          }
        } else {
          district = city; // Use city as district if district is missing
        }
      }

      const locationData = {
        city: city || '',
        district: district || '',
        state: state || '',
        pincode: pincode || '',
        formattedAddress: bestResult?.formatted_address || '',
        accuracy: 'high'
      };

      console.log('📍 Enhanced location data:', locationData);

      // Validate that we have essential information
      if (locationData.state && (locationData.city || locationData.district)) {
        return { 
          ...locationData, 
          source: 'google',
          confidence: 'high',
          timestamp: Date.now()
        };
      } else {
        console.warn('⚠️ Incomplete location data:', locationData);
      }
    } else {
      console.warn('❌ Google Geocoding API error:', googleData.status, googleData.error_message);
      
      if (googleData.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Location service temporarily unavailable. Please try again later.');
      } else if (googleData.status === 'REQUEST_DENIED') {
        throw new Error('Location service access denied. Please check your connection.');
      }
    }

    return null;

  } catch (error) {
    console.error('🚨 Location detection failed:', error.message);
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Get location with fast response and enhanced accuracy - tries Google API, then smart fallback
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>} Location data with fallback
 */
export const getFastLocation = async (latitude, longitude) => {
  try {
    console.log('⚡ Getting fast location with enhanced accuracy...');
    
    // Try enhanced Google API
    const result = await reverseGeocode(latitude, longitude);
    if (result) {
      console.log('✅ Fast location successful:', result);
      return result;
    }

    // If Google fails, provide smart fallback location
    console.log('⚠️ Google API failed, using smart fallback');
    const fallbackData = {
      city: 'Current Location',
      district: 'Unknown District',
      state: 'India',
      pincode: '',
      formattedAddress: 'Current Location, India',
      source: 'fallback',
      confidence: 'low',
      accuracy: 'basic'
    };

    return fallbackData;
  } catch (error) {
    console.warn('🚨 Fast location failed:', error.message);
    // Return basic location data as absolute fallback
    return {
      city: 'Current Location',
      district: 'Unknown District', 
      state: 'India',
      pincode: '',
      formattedAddress: 'Current Location, India',
      source: 'fallback',
      confidence: 'low',
      accuracy: 'basic'
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
