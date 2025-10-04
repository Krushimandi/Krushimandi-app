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

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { config } from '../config';
import { getFastCachedLocation } from './locationCache';

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

    const cameraGranted = await requestCameraPermission();

    const storageGranted = await requestStoragePermission();

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
    return true;
  }

  return await requestImagePickerPermissions();
};

/**
 * Check if GPS/Location services are enabled and prompt user if not
 * @returns {Promise<boolean>} Whether GPS is enabled or user chose to continue anyway
 */
export const checkAndPromptGPSSettings = async () => {
  return new Promise((resolve) => {
    // Quick test to see if location services are working with high accuracy
    Geolocation.getCurrentPosition(
      (position) => {
        // GPS is working - check accuracy quality  
        // If accuracy is poor, suggest settings improvement
        if (position.coords.accuracy > 100) {
          Alert.alert(
            'Improve Location Accuracy',
            'Your GPS is working but accuracy can be improved.\n\nFor better results:\n• Move outdoors with clear sky view\n• Enable "High Accuracy" GPS mode\n• Turn off battery optimization for this app',
            [
              { text: 'Continue Anyway', onPress: () => resolve(true) },
              {
                text: 'GPS Settings',
                onPress: () => {
                  if (Platform.OS === 'android') {
                    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
                      .catch(() => Linking.openSettings());
                  } else {
                    Linking.openSettings();
                  }
                  resolve(true); // Continue after they check settings
                }
              }
            ]
          );
        } else {
          resolve(true);
        }
      },
      (error) => {
        if (error.code === 2) {
          // Location services are disabled
          Alert.alert(
            'Enable GPS',
            'Turn ON Location Services.',
            [
              { text: 'Fill Manually', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'GPS Settings',
                onPress: () => {
                  if (Platform.OS === 'android') {
                    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
                      .catch(() => {
                        // Fallback to general settings if location settings intent fails
                        Linking.openSettings();
                      });
                  } else {
                    Linking.openSettings();
                  }
                  resolve(false);
                }
              }
            ]
          );
        } else if (error.code === 1) {
          // Permission issue
          Alert.alert(
            'Location Permission Required',
            'Please enable location permissions to auto-fill your farm details accurately.',
            [
              { text: 'Fill Manually', onPress: () => resolve(false) },
              { text: 'Grant Permission', onPress: () => resolve(true) }
            ]
          );
        } else {
          // Other error, let the main location function handle it
          resolve(true);
        }
      },
      {
        enableHighAccuracy: true, // Test high accuracy GPS
        timeout: 5000, // Quick check
        maximumAge: 60000
      }
    );
  });
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
    enableHighAccuracy: true, // Enable GPS for better accuracy
    timeout: 15000, // Longer timeout for GPS - 15 seconds
    maximumAge: 30000, // Use fresher location data - 30 seconds max age
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



      // First attempt: High-accuracy GPS location (best accuracy)
      Geolocation.getCurrentPosition(
        (position) => {

          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'GPS-High-Accuracy'
          });
        },
        (error) => {
          console.warn('High-accuracy GPS failed, trying network location...', error);

          // Second attempt: Network/WiFi/Cell Tower location (faster fallback)
          Geolocation.getCurrentPosition(
            (position) => {

              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                source: 'Network'
              });
            },
            (fallbackError) => {
              console.warn('Network location also failed, trying permissive GPS...', fallbackError);

              // Third attempt: Permissive GPS (any available location)
              Geolocation.getCurrentPosition(
                (position) => {

                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    source: 'GPS-Permissive',
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
                      userFriendlyMessage = 'Please enable location permissions in your device settings and restart the app.';
                      break;
                    case 2: // POSITION_UNAVAILABLE
                      errorMessage = 'GPS is turned off or location services are disabled.';
                      userFriendlyMessage = 'Please turn on GPS/Location Services in your device settings. For best accuracy, enable "High Accuracy" mode.';
                      if (Platform.OS === 'android') {
                        Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
                          .catch(() => Linking.openSettings());
                      } else {
                        Linking.openSettings();
                      }
                      break;
                    case 3: // TIMEOUT
                      errorMessage = 'Location request timed out. Poor GPS signal.';
                      userFriendlyMessage = 'GPS signal is weak. Try moving outdoors or to an area with clear sky view for better GPS reception.';
                      break;
                    default:
                      errorMessage = 'Location services unavailable.';
                      userFriendlyMessage = 'Location services are not working properly. Please check your GPS settings and try again.';
                  }

                  const err = new Error(errorMessage);
                  err.userMessage = userFriendlyMessage;
                  err.code = finalError.code;
                  reject(err);
                },
                {
                  // Last chance: Very permissive settings
                  enableHighAccuracy: false,
                  timeout: 8000,
                  maximumAge: 600000, // Accept even 10 minute old location
                  showLocationDialog: false
                }
              );
            },
            {
              // Network fallback: Faster but less accurate
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 60000,
              showLocationDialog: true
            }
          );
        },
        defaultOptions // High accuracy GPS first
      );
    } catch (error) {
      console.error('Location function error:', error);
      const err = new Error('Something went wrong while getting your location.');
      err.userMessage = 'There was a technical error. Please check your GPS settings and try again.';
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


    if (!config.GOOGLE_MAPS_API_KEY) {
      console.error('❌ Google Maps API key not found');
      throw new Error('Google Maps API key not configured');
    }

    // Enhanced timeout for better accuracy (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Google Maps API timeout')), 5000);
    });

    // Enhanced API call with specific parameters for Indian addresses
    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${config.GOOGLE_MAPS_API_KEY}&language=en&region=IN&result_type=street_address|route|intersection|political|country|administrative_area_level_1|administrative_area_level_2|administrative_area_level_3|colloquial_area|locality|sublocality|neighborhood|premise|subpremise|postal_code`;


    const googlePromise = fetch(apiUrl);

    const googleResponse = await Promise.race([googlePromise, timeoutPromise]);

    if (!googleResponse.ok) {
      throw new Error(`Google API HTTP error: ${googleResponse.status} - ${googleResponse.statusText}`);
    }

    const googleData = await googleResponse.json();


    if (googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {


      // Process multiple results to get the most accurate data
      let bestResult = null;
      let city = '';
      let district = '';
      let state = '';
      let pincode = '';

      // Try to find the best result with most complete information
      for (const result of googleData.results) {
        const components = result.address_components || [];
        let tempCity = '';
        let tempDistrict = '';
        let tempState = '';
        let tempPincode = '';



        components.forEach(component => {
          const types = component.types || [];
          const longName = component.long_name;
          const shortName = component.short_name;



          // Enhanced city/village detection with priority system
          if (types.includes('sublocality_level_3') || types.includes('sublocality_level_2')) {
            // Most specific area/neighborhood
            if (!tempCity) tempCity = longName;
          }
          else if (types.includes('sublocality_level_1')) {
            // Sub-area within locality
            if (!tempCity) {
              tempCity = longName;
            } else if (!tempCity.includes(longName)) {
              tempCity = `${tempCity}, ${longName}`;
            }
          }
          else if (types.includes('neighborhood')) {
            // Neighborhood level
            if (!tempCity) tempCity = longName;
          }
          else if (types.includes('route')) {
            // Street/road level - only if no other city info
            if (!tempCity) tempCity = longName;
          }
          else if (types.includes('locality')) {
            // This is usually the main city name (like "Pune")
            if (!tempCity) {
              tempCity = longName;
            } else if (!tempDistrict) {
              tempDistrict = longName; // Use as district if city already has specific area
            }
          }

          // District detection - prefer locality over administrative levels
          if (types.includes('administrative_area_level_2') && !tempDistrict) {
            tempDistrict = longName;
          }
          else if (types.includes('locality') && !tempDistrict && tempCity !== longName) {
            tempDistrict = longName;
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
        if (tempState && (tempCity || tempDistrict)) {
          city = tempCity;
          district = tempDistrict;
          state = tempState;
          pincode = tempPincode;
          bestResult = result;

          // If we have good data, break early
          if (tempCity && tempDistrict && tempPincode) {
            break;
          }
        }
      }

      // Smart fallback logic if we don't have complete data
      if (!city && district) {
        city = district;
      }
      if (!district && city) {
        district = city;
      }

      // Parse formatted address as fallback
      if (!city && bestResult?.formatted_address) {
        const addressParts = bestResult.formatted_address.split(',');
        if (addressParts.length > 0) {
          city = addressParts[0].trim();
          if (addressParts.length > 1 && !district) {
            district = addressParts[1].trim();
          }
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



      // Validate that we have essential information
      if (locationData.state && (locationData.city || locationData.district)) {
        return {
          ...locationData,
          source: 'google',
          confidence: 'high',
          timestamp: Date.now()
        };
      } else {
        console.warn('⚠️ Incomplete address data:', locationData);
        throw new Error('Incomplete address information received');
      }

    } else {
      console.warn('❌ Google Geocoding API error:', googleData.status, googleData.error_message);

      if (googleData.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Location service temporarily unavailable. Please try again later.');
      } else if (googleData.status === 'REQUEST_DENIED') {
        throw new Error('Location service access denied. Please check API configuration.');
      } else if (googleData.status === 'ZERO_RESULTS') {
        throw new Error('No address found for this location. Try moving to a different area.');
      } else {
        throw new Error(`Location service error: ${googleData.status}`);
      }
    }

  } catch (error) {
    console.error('🚨 Address lookup failed:', error.message);
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


    // Try enhanced Google API with longer timeout for better results
    const result = await Promise.race([
      reverseGeocode(latitude, longitude),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Address lookup timeout')), 10000); // 10 second timeout
      })
    ]);

    if (result && result.city && result.state) {

      return result;
    }

    throw new Error('Incomplete address data received');

  } catch (error) {
    console.warn('🚨 Address lookup failed:', error.message);

    // Provide informative fallback based on coordinates
    let areaName = 'Your Location';
    let regionInfo = 'Unknown Area';

    // Enhanced coordinate-based region detection for India
    if (latitude >= 8.0 && latitude <= 37.0 && longitude >= 68.0 && longitude <= 97.0) {
      // Indian coordinate bounds - provide regional context
      if (latitude >= 28.0 && latitude <= 31.0 && longitude >= 76.0 && longitude <= 78.0) {
        regionInfo = 'Delhi/NCR Region';
        areaName = 'Near Delhi';
      } else if (latitude >= 18.0 && latitude <= 20.0 && longitude >= 72.0 && longitude <= 73.5) {
        regionInfo = 'Mumbai Region';
        areaName = 'Near Mumbai';
      } else if (latitude >= 12.5 && latitude <= 13.5 && longitude >= 77.0 && longitude <= 78.0) {
        regionInfo = 'Bangalore Region';
        areaName = 'Near Bangalore';
      } else if (latitude >= 17.0 && latitude <= 18.0 && longitude >= 78.0 && longitude <= 79.0) {
        regionInfo = 'Hyderabad Region';
        areaName = 'Near Hyderabad';
      } else if (latitude >= 18.0 && latitude <= 19.0 && longitude >= 73.5 && longitude <= 74.5) {
        regionInfo = 'Pune Region';
        areaName = 'Near Pune';
      } else if (latitude >= 22.0 && latitude <= 23.0 && longitude >= 72.0 && longitude <= 73.0) {
        regionInfo = 'Ahmedabad Region';
        areaName = 'Near Ahmedabad';
      } else if (latitude >= 26.0 && latitude <= 27.0 && longitude >= 75.0 && longitude <= 76.0) {
        regionInfo = 'Jaipur Region';
        areaName = 'Near Jaipur';
      } else {
        // Generic region with coordinates for reference
        regionInfo = `Coordinates ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
        areaName = 'GPS Location';
      }
    } else {
      // Outside India
      regionInfo = `Location ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
      areaName = 'Current Location';
    }

    const fallbackData = {
      city: areaName,
      district: regionInfo,
      state: 'India',
      pincode: '',
      formattedAddress: `${areaName}, ${regionInfo}, India (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      source: 'coordinate-fallback',
      confidence: 'low',
      accuracy: 'regional',
      coordinates: { latitude, longitude },
      note: 'Please verify and correct the address manually'
    };


    return fallbackData;
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

/**
 * Debug function to test reverse geocoding with coordinates
 * Usage: Call this function with your coordinates to test address lookup
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>} Complete test results
 */
export const testReverseGeocode = async (latitude, longitude) => {


  const results = {
    coordinates: { latitude, longitude },
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test Google API configuration

    results.tests.apiKeyAvailable = !!config.GOOGLE_MAPS_API_KEY;

    if (!config.GOOGLE_MAPS_API_KEY) {
      results.error = 'Google Maps API key not configured';
      return results;
    }

    // Test reverse geocoding

    const reverseGeocodeResult = await reverseGeocode(latitude, longitude);
    results.tests.reverseGeocode = {
      success: true,
      data: reverseGeocodeResult
    };

    // Test fast location

    const fastLocationResult = await getFastLocation(latitude, longitude);
    results.tests.fastLocation = {
      success: true,
      data: fastLocationResult
    };


    results.success = true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    results.error = error.message;
    results.success = false;
  }


  return results;
};

/**
 * Get current location and address with intelligent caching
 * This is the main function to use in your components for fast location access
 * @param {object} options - Options for location request
 * @returns {Promise<object>} Location and address data
 */
export const getLocationWithCache = async (options = {}) => {
  try {


    const result = await getFastCachedLocation(options);

    // Return in the format expected by existing components
    return {
      location: {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        accuracy: result.location.accuracy,
        source: result.location.source
      },
      locationData: {
        city: result.address.city || '',
        district: result.address.district || '',
        state: result.address.state || '',
        pincode: result.address.pincode || '',
        formattedAddress: result.address.formattedAddress || '',
        source: result.source,
        cacheAge: result.cacheAge
      }
    };

  } catch (error) {
    console.error('❌ Cached location failed, falling back to regular method:', error);

    // Fallback to original method
    const location = await getCurrentLocation();
    if (location) {
      const locationData = await getFastLocation(location.latitude, location.longitude);
      return {
        location: location,
        locationData: locationData
      };
    }

    throw error;
  }
};
