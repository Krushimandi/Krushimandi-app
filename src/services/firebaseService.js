// Firebase modular consolidated imports
import {
  auth as firebaseAuth,
  firestore as firebaseFirestore,
  serverTimestamp as firestoreServerTimestamp,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit
} from '../config/firebaseModular';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { clearUserRole } from '../utils/userRoleStorage';
import { persistentAuthManager } from '../utils/persistentAuthManager';
// Temporary import for FieldValue.delete sentinel until exposed via firebaseModular (optional refactor later)
import firestoreFieldValue from '@react-native-firebase/firestore';

/**
 * Firebase Service for User Management
 * Handles Firestore, Storage, and AsyncStorage synchronization
 * With offline capability and network error handling
 */
const COLLECTIONS = {
  PROFILES: 'profiles',
};

// Storage paths based on user roles
const STORAGE_PATHS = {
  FARMERS: {
    AVATARS: 'farmers/avatars',
    DOCUMENTS: 'farmers/documents',
  },
  BUYERS: {
    AVATARS: 'buyers/avatars',
    DOCUMENTS: 'buyers/documents',
  },
};

// Offline state management
let isOffline = false;
let offlineQueue = [];
let isProcessingQueue = false;

// Network monitoring state
let networkListener = null;

/**
 * Initialize network state monitoring
 */
export const initializeNetworkMonitoring = () => {
  // Prevent duplicate listeners
  if (networkListener) {
    console.log('📶 Network monitoring already initialized');
    return;
  }

  networkListener = NetInfo.addEventListener(state => {
    const wasOffline = isOffline;
    isOffline = !state.isConnected;

    console.log(`📶 Network state changed: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);

    // If coming back online, process offline queue
    if (wasOffline && !isOffline) {
      processOfflineQueue();
    }
  });
};

/**
 * Force update user profile from Firestore and update local cache
 * @returns {Promise<object|null>} Latest user profile or null
 */
export const updateUserProfile = async () => {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return null;

    // Try to get user role from AsyncStorage
    const localData = await getUserFromAsyncStorage();
    const userRole = localData?.userRole;
    if (!userRole) return null;

    // Fetch from Firestore (force refresh)
    const firestoreData = await getUserFromFirestore(user.uid, userRole);
    if (!firestoreData) return localData;

    // Compare profileImage URLs
    const localImage = localData?.profileImage;
    const remoteImage = firestoreData.profileImage;

    if (localImage === remoteImage) {
      // No change, use local data
      return localData;
    } else {
      // Image changed, update local cache and offline state
      await saveUserToAsyncStorage(firestoreData);
      await saveOfflineAuthState(firestoreData);
      return firestoreData;
    }
  } catch (error) {
    console.error('❌ updateUserProfile failed:', error);
    return null;
  }
};

/**
 * Check if device is currently online
 * @returns {Promise<boolean>}
 */
export const isNetworkAvailable = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  } catch (error) {
    console.error('❌ Error checking network status:', error);
    return false;
  }
};

/**
 * Add operation to offline queue for later execution
 * @param {string} operation - Operation type
 * @param {object} data - Operation data
 */
const addToOfflineQueue = (operation, data) => {
  offlineQueue.push({
    operation,
    data,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  });

  // Store offline queue in AsyncStorage
  AsyncStorage.setItem('offlineQueue', JSON.stringify(offlineQueue))
    .catch(err => console.error('❌ Failed to save offline queue:', err));

  console.log(`📱 Added to offline queue: ${operation}`, data);
};

/**
 * Process offline queue when network becomes available
 */
const processOfflineQueue = async () => {
  // Prevent concurrent processing
  if (isProcessingQueue) {
    console.log('🔄 Offline queue already being processed, skipping...');
    return;
  }

  isProcessingQueue = true;

  try {
    console.log('🔄 Processing offline queue...', offlineQueue.length, 'items');

    // Load queue from storage in case app was restarted
    const storedQueue = await AsyncStorage.getItem('offlineQueue');
    if (storedQueue) {
      offlineQueue = [...offlineQueue, ...JSON.parse(storedQueue)];
    }

    const processedItems = [];

    for (const item of offlineQueue) {
      try {
        switch (item.operation) {
          case 'updateLastLogin':
            // Directly call Firestore operation to avoid re-queuing
            await updateUserInFirestore(item.data.userId, item.data.userRole, {
              lastLoginAt: firestoreServerTimestamp(),
            });
            break;
          case 'saveUserProfile':
            await saveUserToFirestore(item.data);
            break;
          case 'updateUserProfile':
            await updateUserInFirestore(item.data.userId, item.data.userRole, item.data.updateData);
            break;
          default:
            console.log('⚠️ Unknown offline operation:', item.operation);
        }

        processedItems.push(item.id);
        console.log('✅ Processed offline item:', item.operation);
      } catch (error) {
        console.error('❌ Failed to process offline item:', item.operation, error);
        // Keep failed items in queue for retry
      }
    }

    // Remove processed items from queue
    offlineQueue = offlineQueue.filter(item => !processedItems.includes(item.id));

    // Update stored queue
    await AsyncStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));

    console.log('✅ Offline queue processed. Remaining items:', offlineQueue.length);
  } catch (error) {
    console.error('❌ Error processing offline queue:', error);
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Handle network errors gracefully
 * @param {Error} error - The error object
 * @param {string} operation - The operation that failed
 * @param {object} fallbackData - Fallback data for offline scenarios
 * @returns {object} Error handling result
 */
const handleNetworkError = async (error, operation, fallbackData = null) => {
  const errorMessage = error.message?.toLowerCase() || '';
  const isNetworkError =
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('offline') ||
    error.code === 'unavailable' ||
    error.code === 'deadline-exceeded';

  if (isNetworkError) {
    console.log(`📱 Network error detected for ${operation}, handling offline:`, error.message);

    return {
      isNetworkError: true,
      handled: true,
      message: 'You appear to be offline. Your data has been saved locally and will sync when connection is restored.',
      fallbackData
    };
  }

  return {
    isNetworkError: false,
    handled: false,
    message: error.message
  };
};

/**
 * Save offline authentication state
 * @param {object} authData - Authentication data to save offline
 */
export const saveOfflineAuthState = async (authData) => {
  try {
    const offlineAuthData = {
      ...authData,
      isOfflineAuth: true,
      lastOfflineSync: Date.now(),
      savedAt: new Date().toISOString()
    };

    await AsyncStorage.setItem('offlineAuthState', JSON.stringify(offlineAuthData));
    console.log('✅ Offline auth state saved');
  } catch (error) {
    console.error('❌ Failed to save offline auth state:', error);
  }
};

/**
 * Get offline authentication state
 * @returns {Promise<object|null>}
 */
export const getOfflineAuthState = async () => {
  try {
    const offlineAuthData = await AsyncStorage.getItem('offlineAuthState');
    if (offlineAuthData) {
      const parsed = JSON.parse(offlineAuthData);
      console.log('📱 Offline auth state retrieved');
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get offline auth state:', error);
    return null;
  }
};

/**
 * Clear offline authentication state
 */
export const clearOfflineAuthState = async () => {
  try {
    await AsyncStorage.removeItem('offlineAuthState');
    console.log('✅ Offline auth state cleared');
  } catch (error) {
    console.error('❌ Failed to clear offline auth state:', error);
  }
};


/**
 * Firebase Service for User Management
 * Handles Firestore, Storage, and AsyncStorage synchronization
 */

/**
 * Get collection name based on user role
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {string} Collection name
 */
const getCollectionName = () => {
  return COLLECTIONS.PROFILES;
};

/**
 * Get storage path based on user role
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {object} Storage paths for the role
 */
const getStoragePaths = (userRole) => {
  return userRole === 'farmer' ? STORAGE_PATHS.FARMERS : STORAGE_PATHS.BUYERS;
};

/**
 * Upload profile avatar to Firebase Storage
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User UID
 * @param {string} userRole - 'farmer' or 'buyer'
 * @param {function} onProgress - Progress callback function
 * @returns {Promise<string>} Download URL
 */

export const clearAuthData = async () => {
  try {
    // Clear all auth-related AsyncStorage keys
    await AsyncStorage.multiRemove([
      'userData',
      'user_role',
      'auth_state',
      'authStep',
    ]);

    // Clear user role storage
    await clearUserRole();
    // Clear any other app-specific storage
    // Add any other storage keys your app uses

    console.log('✅ All auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    throw error;
  }
};


export const uploadProfileAvatar = async (imageUri, userId, userRole, onProgress = null) => {
  try {
    console.log('📸 Uploading profile avatar...', { userId, userRole });

    const storagePaths = getStoragePaths(userRole);
    const fileName = `${userId}_${Date.now()}.jpg`;
    const reference = storage().ref(`${storagePaths.AVATARS}/${fileName}`);

    // Upload the file
    const uploadTask = reference.putFile(imageUri);

    // Monitor upload progress
    uploadTask.on('state_changed',
      (taskSnapshot) => {
        const progress = (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100;
        const bytesTransferred = taskSnapshot.bytesTransferred;
        const totalBytes = taskSnapshot.totalBytes;

        console.log(`📸 Upload progress: ${progress.toFixed(2)}% (${bytesTransferred}/${totalBytes} bytes)`);

        // Call progress callback if provided
        if (onProgress && typeof onProgress === 'function') {
          onProgress({
            progress: progress,
            bytesTransferred: bytesTransferred,
            totalBytes: totalBytes,
            state: taskSnapshot.state
          });
        }
      },
      (error) => {
        console.error('📸 Upload error:', error);
        if (onProgress) {
          onProgress({ error: error.message });
        }
      }
    );

    // Wait for upload to complete
    await uploadTask;

    // Get download URL
    const downloadURL = await reference.getDownloadURL();
    console.log('✅ Avatar uploaded successfully:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('❌ Avatar upload failed:', error);
    throw new Error('Failed to upload profile avatar');
  }
};

/**
 * Save user data to Firestore
 * @param {object} userData - User data object
 * @returns {Promise<void>}
 */
export const saveUserToFirestore = async (userData) => {
  try {
    const collectionName = getCollectionName();
    await ensureCollectionExists();
    const now = firestoreServerTimestamp();
    const userDoc = {
      uid: userData.uid,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      displayName: (userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`).trim(),
      phoneNumber: userData.phoneNumber || null,
      userRole: userData.userRole,
      profileImage: userData.profileImage || null,
      isProfileComplete: !!userData.isProfileComplete,
      isPhoneVerified: userData.isPhoneVerified !== undefined ? userData.isPhoneVerified : true,
      createdAt: userData.createdAt || now,
      updatedAt: now,
      lastLoginAt: userData.lastLoginAt || now,
      status: userData.status || 'active',
      ...(userData.userRole === 'farmer' && {
        farmDetails: userData.farmDetails || null,
        cropTypes: userData.cropTypes || [],
        farmLocation: userData.farmLocation || null,
      }),
      ...(userData.userRole === 'buyer' && {
        businessType: userData.businessType || null,
        PreferedFruits: userData.PreferedFruits || userData.preferredCrops || [],
      }),
    };
    const ref = doc(firebaseFirestore, collectionName, userData.uid);
    await setDoc(ref, userDoc, { merge: true });
    console.log('✅ User saved to unified profiles collection');
  } catch (error) {
    console.error('❌ Failed to save user to unified profiles collection:', error);
    throw new Error('Failed to save user data');
  }
};

/**
 * Get user data from Firestore
 * @param {string} userId - User UID
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {Promise<object|null>} User data or null
 */
export const getUserFromFirestore = async (userId, userRole) => {
  try {
    console.log('📖 Getting user from Firestore...', { userId, userRole });

    const collectionName = getCollectionName(userRole);
    const userDocRef = doc(firebaseFirestore, collectionName, userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ User found in Firestore');
      return userData;
    } else {
      console.log('❌ User not found in Firestore');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get user from Firestore:', error);
    return null;
  }
};

/**
 * Update user data in Firestore
 * @param {string} userId - User UID
 * @param {string} userRole - 'farmer' or 'buyer'
 * @param {object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateUserInFirestore = async (userId, userRole, updateData) => {
  try {
    console.log('🔄 Updating user in Firestore...', { userId, userRole });

    const collectionName = getCollectionName(userRole);
    const updates = {
      ...updateData,
      updatedAt: firestoreServerTimestamp(),
    };

    const userDocRef = doc(firebaseFirestore, collectionName, userId);
    await updateDoc(userDocRef, updates);

    console.log('✅ User updated in Firestore successfully');
  } catch (error) {
    console.error('❌ Failed to update user in Firestore:', error);
    throw new Error('Failed to update user data');
  }
};

export const cleanupUnusedBuyerFields = async (userId) => {
  try {
    const del = firestoreFieldValue.FieldValue.delete();
    const ref = doc(firebaseFirestore, COLLECTIONS.PROFILES, userId);
    await updateDoc(ref, { preferredCrops: del, businessDetails: del });
    console.log('🧹 Cleaned legacy buyer fields inside profiles for:', userId);
  } catch (error) {
    console.warn('⚠️ Cleanup (legacy buyer fields) failed (non-blocking):', error?.message || error);
  }
};

/**
 * Save user data to AsyncStorage
 * @param {object} userData - User data object
 * @returns {Promise<void>}
 */
export const saveUserToAsyncStorage = async (userData) => {
  try {
    console.log('💾 Saving user to AsyncStorage...', userData.uid);

    const storageData = {
      uid: userData.uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.displayName,
      phoneNumber: userData.phoneNumber,
      userRole: userData.userRole,
      profileImage: userData.profileImage,
      isProfileComplete: userData.isProfileComplete,
      lastSyncAt: new Date().toISOString(),
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Persist location when available
      ...(userData.location ? { location: userData.location } : {}),
      // Persist new buyer-specific optional fields and fruits preference when present
      ...(userData.userRole === 'buyer' && {
        businessType: userData.businessType || null,
        PreferedFruits: userData.PreferedFruits || userData.preferredCrops || [],
      }),
    };

    await AsyncStorage.setItem('userData', JSON.stringify(storageData));

    // Set auth step based on profile completion
    if (userData.isProfileComplete) {
      await AsyncStorage.setItem('authStep', 'Complete');
    }

    console.log('✅ User saved to AsyncStorage successfully');
  } catch (error) {
    console.error('❌ Failed to save user to AsyncStorage:', error);
  }
};

/**
 * Update user's location with offline support and local cache sync
 * @param {string} userId - User UID
 * @param {('farmer'|'buyer')} userRole - Role for collection selection
 * @param {object} location - Location object { city, district, state, pincode, formattedAddress, latitude, longitude }
 * @returns {Promise<boolean>} Success
 */
export const updateUserLocation = async (userId, userRole, location) => {
  try {
    if (!userId || !userRole || !location) {
      throw new Error('Missing required parameters to update location');
    }

    // Normalize location payload
    const normalizedLocation = {
      city: location.city || '',
      district: location.district || '',
      state: location.state || '',
      pincode: location.pincode || '',
      formattedAddress: location.formattedAddress || '',
      latitude: location.latitude,
      longitude: location.longitude,
      updatedAt: new Date().toISOString(),
    };

    const isOnline = await isNetworkAvailable();

    if (isOnline) {
      await updateUserInFirestore(userId, userRole, { location: normalizedLocation });
    } else {
      // Queue for later
      addToOfflineQueue('updateUserProfile', { userId, userRole, updateData: { location: normalizedLocation } });
    }

    // Update local cache
    const local = await getUserFromAsyncStorage();
    if (local && local.uid === userId) {
      await saveUserToAsyncStorage({ ...local, location: normalizedLocation });
    }

    // Also update offline auth state
    const offlineAuth = await getOfflineAuthState();
    if (offlineAuth && offlineAuth.uid === userId) {
      await saveOfflineAuthState({ ...offlineAuth, location: normalizedLocation });
    }

    console.log('✅ Location update processed (online:', isOnline, ')');
    return true;
  } catch (error) {
    console.error('❌ Failed to update user location:', error);
    return false;
  }
};

/**
 * Get user data from AsyncStorage
 * @returns {Promise<object|null>} User data or null
 */
export const getUserFromAsyncStorage = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Failed to get user from AsyncStorage:', error);
    return null;
  }
};

/**
 * Comprehensive user profile update with sync across all platforms
 * Now with offline capability and network error handling
 * @param {object} profileData - Profile data to update
 * @param {function} onProgress - Progress callback function
 * @returns {Promise<boolean>} Success status
 */
export const syncUserProfile = async (profileData, onProgress = null) => {
  try {
    console.log('🔄 Starting comprehensive user profile sync...', {
      role: profileData.userRole,
      hasAvatar: !!profileData.avatar,
      firstName: profileData.firstName
    });

    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Check network connectivity first
    const isOnline = await isNetworkAvailable();
    console.log(`📶 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // Validate required fields
    if (!profileData.firstName || !profileData.lastName) {
      throw new Error('First name and last name are required');
    }

    if (!profileData.userRole || !['farmer', 'buyer'].includes(profileData.userRole)) {
      throw new Error('Valid user role (farmer/buyer) is required');
    }

    let updatedData = { ...profileData };

    // 1. Upload avatar to Firebase Storage if provided (only if online)
    if (profileData.avatar && profileData.avatar.startsWith('file://')) {
      console.log('📸 Uploading new avatar to Firebase Storage...');

      if (onProgress) onProgress({ step: 'uploading_avatar', message: 'Uploading profile photo...' });

      if (isOnline) {
        try {
          const avatarURL = await uploadProfileAvatar(
            profileData.avatar,
            user.uid,
            profileData.userRole,
            onProgress
          );
          updatedData.profileImage = avatarURL;
          console.log('✅ Avatar uploaded successfully');

          if (onProgress) onProgress({ step: 'avatar_complete', message: 'Photo uploaded successfully' });
        } catch (error) {
          console.error('❌ Avatar upload failed:', error);
          const errorResult = await handleNetworkError(error, 'avatar_upload');

          if (errorResult.isNetworkError) {
            // Save avatar locally for later upload
            await AsyncStorage.setItem('pendingAvatarUpload', JSON.stringify({
              imageUri: profileData.avatar,
              userId: user.uid,
              userRole: profileData.userRole,
              timestamp: Date.now()
            }));

            // Use local avatar for now
            updatedData.profileImage = profileData.avatar;
            if (onProgress) onProgress({ step: 'avatar_offline', message: 'Photo saved locally, will upload when online' });
          } else {
            updatedData.profileImage = null;
            if (onProgress) onProgress({ step: 'avatar_error', message: 'Photo upload failed, continuing...' });
          }
        }
      } else {
        // Offline - save avatar for later upload
        await AsyncStorage.setItem('pendingAvatarUpload', JSON.stringify({
          imageUri: profileData.avatar,
          userId: user.uid,
          userRole: profileData.userRole,
          timestamp: Date.now()
        }));

        updatedData.profileImage = profileData.avatar; // Use local path
        if (onProgress) onProgress({ step: 'avatar_offline', message: 'Photo saved locally, will upload when online' });
      }
    }

    // 2. Update Firebase Auth profile (skip if offline)
    if (isOnline) {
      console.log('🔐 Updating Firebase Auth profile...');
      if (onProgress) onProgress({ step: 'updating_auth', message: 'Updating authentication profile...' });

      try {
        await user.updateProfile({
          displayName: updatedData.displayName || `${updatedData.firstName} ${updatedData.lastName}`,
          photoURL: updatedData.profileImage,
        });
      } catch (error) {
        const errorResult = await handleNetworkError(error, 'auth_update');
        if (!errorResult.isNetworkError) {
          throw error; // Re-throw non-network errors
        }
        console.log('📱 Auth update queued for later (offline)');
      }
    } else {
      if (onProgress) onProgress({ step: 'auth_offline', message: 'Auth update queued for when online' });
    }

    // 3. Save/Update in Firestore (with offline handling)
    console.log('💾 Syncing with Firestore...');
    if (onProgress) onProgress({ step: 'saving_firestore', message: 'Saving user data...' });

    const completeUserData = {
      ...updatedData,
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: true,
      displayName: updatedData.displayName || `${updatedData.firstName} ${updatedData.lastName}`,
      // carry forward fruits preference and optional businessType for buyers
      ...(updatedData.userRole === 'buyer' && {
        PreferedFruits: updatedData.PreferedFruits || updatedData.preferredCrops || [],
        businessType: updatedData.businessType || null,
      }),
    };

    if (isOnline) {
      try {
        await saveUserToFirestore(completeUserData);
      } catch (error) {
        const errorResult = await handleNetworkError(error, 'firestore_save', completeUserData);
        if (errorResult.isNetworkError) {
          // Add to offline queue
          addToOfflineQueue('saveUserProfile', completeUserData);
          if (onProgress) onProgress({ step: 'firestore_offline', message: 'User data queued for sync when online' });
        } else {
          throw error;
        }
      }
    } else {
      // Add to offline queue
      addToOfflineQueue('saveUserProfile', completeUserData);
      if (onProgress) onProgress({ step: 'firestore_offline', message: 'User data queued for sync when online' });
    }

    // 4. Update AsyncStorage (always works offline)
    console.log('💾 Updating AsyncStorage...');
    if (onProgress) onProgress({ step: 'saving_local', message: 'Saving locally...' });

    await saveUserToAsyncStorage(completeUserData);

    // 5. Save offline auth state for persistence
    await saveOfflineAuthState(completeUserData);

    console.log('✅ User profile sync completed successfully!');
    if (onProgress) onProgress({
      step: 'complete',
      message: isOnline ? 'Profile saved successfully!' : 'Profile saved locally and will sync when online!'
    });

    return true;
  } catch (error) {
    console.error('❌ User profile sync failed:', error);

    if (onProgress) onProgress({ step: 'error', message: `Error: ${error.message}` });

    // Show different alerts based on network status
    const isOnline = await isNetworkAvailable();

    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'You appear to be offline. Your profile has been saved locally and will sync automatically when you reconnect to the internet.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Sync Error',
        `Failed to save profile data: ${error.message}. Please check your internet connection and try again.`,
        [{ text: 'OK' }]
      );
    }

    return false;
  }
};

/**
 * Get complete user profile from multiple sources
 * Now with offline capability and graceful fallback
 * @param {boolean} forceRefresh - Force refresh from Firestore
 * @returns {Promise<object|null>} Complete user profile
 */
export const getCompleteUserProfile = async (forceRefresh = false) => {
  try {
    console.log('📖 Getting complete user profile...');

    const user = firebaseAuth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user');
      // Check if we have offline auth state
      const offlineAuth = await getOfflineAuthState();
      if (offlineAuth && offlineAuth.isOfflineAuth) {
        console.log('📱 Using offline auth state');
        return offlineAuth;
      }

      return null;
    }

    // Check network connectivity
    const isOnline = await isNetworkAvailable();
    console.log(`📶 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // Try AsyncStorage first for speed (and offline scenarios)
    if (!forceRefresh || !isOnline) {
      const localData = await getUserFromAsyncStorage();
      if (localData && localData.uid === user.uid) {
        console.log('✅ User profile loaded from AsyncStorage');

        // If offline, this is our only option
        if (!isOnline) {
          console.log('📱 Offline mode: using cached profile data');
          return localData;
        }

        // If online but not forcing refresh, use cached data
        if (!forceRefresh) {
          return localData;
        }
      }
    }

    // If offline and no local data, try offline auth state
    if (!isOnline) {
      console.log('📱 Offline mode: checking offline auth state');
      const offlineAuth = await getOfflineAuthState();
      if (offlineAuth && offlineAuth.isOfflineAuth) {
        console.log('📱 Using offline auth state as fallback');
        return offlineAuth;
      }

      console.log('❌ No offline data available');
      return null;
    }

    // Try to get user role from AsyncStorage for online fetch
    const authStep = await AsyncStorage.getItem('authStep');
    const localData = await getUserFromAsyncStorage();
    const userRole = localData?.userRole;
    console.log(localData ? '✅ Local user data found' : '❌ No local user data found');
    console.log(userRole ? `✅ User role: ${userRole}` : '❌ No user role found in local data');

  if (userRole) {
      try {
        // Get from Firestore and update AsyncStorage
        const firestoreData = await getUserFromFirestore(user.uid, userRole);
        if (firestoreData) {
          await saveUserToAsyncStorage(firestoreData);

          // Update offline auth state as backup
          await saveOfflineAuthState(firestoreData);

          console.log('✅ User profile loaded from Firestore and cached');
          return firestoreData;
        }
      } catch (error) {
        const errorResult = await handleNetworkError(error, 'get_user_profile');
        if (errorResult.isNetworkError) {
          console.log('📱 Network error getting profile, falling back to local data');

          // Fall back to local data if available
          if (localData) {
            return localData;
          }

          // Try offline auth state as last resort
          const offlineAuth = await getOfflineAuthState();
          if (offlineAuth) {
            return offlineAuth;
          }
        } else {
          console.error('❌ Non-network error getting profile:', error);
        }
      }
    }

    // Fallback: no local userRole or role-based fetch failed earlier – try unified profiles/{uid}
    try {
      const unifiedRef = doc(firebaseFirestore, COLLECTIONS.PROFILES, user.uid);
      const unifiedSnap = await getDoc(unifiedRef);
      if (unifiedSnap.exists()) {
        const unifiedData = { uid: user.uid, ...unifiedSnap.data() };
        console.log('✅ User profile loaded from unified profiles collection');
        await saveUserToAsyncStorage(unifiedData);
        // Also update offline auth state for resilience
        await saveOfflineAuthState(unifiedData);
        return unifiedData;
      }
    } catch (unifiedErr) {
      console.warn('⚠️ Unified profiles fallback failed:', unifiedErr?.message || unifiedErr);
    }

    console.log('❌ User profile not found');
    return null;

  } catch (error) {
    console.error('❌ Failed to get complete user profile:', error);

    // Try to fall back to local data in case of any error
    try {
      const localData = await getUserFromAsyncStorage();
      if (localData) {
        console.log('📱 Error occurred, falling back to local data');
        return localData;
      }

      const offlineAuth = await getOfflineAuthState();
      if (offlineAuth) {
        console.log('📱 Error occurred, falling back to offline auth state');
        return offlineAuth;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback data retrieval also failed:', fallbackError);
    }

    return null;
  }
};

/**
 * Update last login time with offline support
 * @param {string} userId - User UID
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {Promise<void>}
 */
export const updateLastLogin = async (userId, userRole) => {
  try {
    // Check if online
    const isOnline = await isNetworkAvailable();

    if (isOnline) {
      await updateUserInFirestore(userId, userRole, {
        lastLoginAt: firestoreServerTimestamp(),
      });
      console.log('✅ Last login updated in Firestore');
    } else {
      // Queue for later when online
      addToOfflineQueue('updateLastLogin', { userId, userRole });
      console.log('📱 Last login update queued for when online');
    }
  } catch (error) {
    const errorResult = await handleNetworkError(error, 'update_last_login');
    if (errorResult.isNetworkError) {
      // Add to offline queue
      addToOfflineQueue('updateLastLogin', { userId, userRole });
      console.log('📱 Last login update queued due to network error');
    } else {
      console.error('❌ Failed to update last login:', error);
    }
  }
};

/**
 * Clear all user data (for logout) including offline state
 * @returns {Promise<void>}
 */
export const clearUserData = async () => {
  try {
    console.log('🗑️ Clearing user data...');

    await AsyncStorage.multiRemove(['userData', 'authStep', 'offlineAuthState', 'offlineQueue', 'pendingAvatarUpload']);
    await clearOfflineAuthState();
    await firebaseAuth.signOut();

    console.log('✅ User data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear user data:', error);
  }
};

/**
 * Validate if user profile is complete across all platforms
 * @param {string} userId - User UID
 * @returns {Promise<object>} Validation result with status and missing fields
 */
export const validateUserProfileCompleteness = async (userId) => {
  try {
    console.log('🔍 Validating user profile completeness...', userId);

    const user = firebaseAuth.currentUser;
    if (!user || user.uid !== userId) {
      return { isComplete: false, missingFields: ['authentication'] };
    }

    // Get data from AsyncStorage
    const localData = await getUserFromAsyncStorage();

    const missingFields = [];

    // Check Firebase Auth
    if (!user.phoneNumber) missingFields.push('phoneNumber');

    // Check local/Firestore data
    if (!localData) {
      missingFields.push('userData');
    } else {
      if (!localData.firstName) missingFields.push('firstName');
      if (!localData.lastName) missingFields.push('lastName');
      if (!localData.userRole || !['farmer', 'buyer'].includes(localData.userRole)) {
        missingFields.push('userRole');
      }
      if (!localData.isProfileComplete) missingFields.push('profileComplete');
    }

    // Check if user exists in Firestore
    if (localData?.userRole) {
      const firestoreData = await getUserFromFirestore(userId, localData.userRole);
      if (!firestoreData) {
        missingFields.push('firestoreSync');
      }
    }

    const isComplete = missingFields.length === 0;

    console.log('✅ Profile validation complete:', {
      isComplete,
      missingFields,
      userRole: localData?.userRole
    });

    return { isComplete, missingFields, userData: localData };

  } catch (error) {
    console.error('❌ Profile validation failed:', error);
    return { isComplete: false, missingFields: ['validation_error'], error };
  }
};

/**
 * Debug function to log complete user data across all platforms
 * @returns {Promise<void>}
 */
export const debugUserData = async () => {
  try {
    const user = firebaseAuth.currentUser;

    console.log('=== USER DATA DEBUG ===');
    console.log('Firebase Auth User:', user ? {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      photoURL: user.photoURL,
    } : 'None');

    // AsyncStorage data
    const localData = await getUserFromAsyncStorage();
    console.log('AsyncStorage Data:', localData || 'None');

    // Auth step
    const authStep = await AsyncStorage.getItem('authStep');
    console.log('Auth Step:', authStep || 'None');

    // Firestore data (if available)
    if (user && localData?.userRole) {
      const firestoreData = await getUserFromFirestore(user.uid, localData.userRole);
      console.log('Firestore Data:', firestoreData || 'None');
    }

    // Validation
    if (user) {
      const validation = await validateUserProfileCompleteness(user.uid);
      console.log('Profile Validation:', validation);
    }

    console.log('=====================');
  } catch (error) {
    console.error('Debug failed:', error);
  }
};

/**
 * Check if current user is valid and handle deleted users
 * Now with offline support - user stays logged in when offline
 * @returns {Promise<boolean>} True if user is valid
 */
export const validateCurrentUser = async () => {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) {
      console.log('❌ No current user found');

      // Check offline auth state
      const offlineAuth = await getOfflineAuthState();
      if (offlineAuth && offlineAuth.isOfflineAuth) {
        console.log('📱 No Firebase auth user, but offline auth state exists');
        return true; // Allow offline access
      }

      return false;
    }

    console.log('🔍 Validating current user...', user.uid);

    // Check network connectivity
    const isOnline = await isNetworkAvailable();
    console.log(`📶 Network status for validation: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // If offline, allow user to stay logged in using cached data
    if (!isOnline) {
      console.log('📱 Offline mode: skipping Firebase validation, using local auth state');

      // Check if we have local user data
      const localData = await getUserFromAsyncStorage();
      const offlineAuth = await getOfflineAuthState();

      if (localData || offlineAuth) {
        console.log('✅ Offline validation successful - user has local data');
        return true;
      } else {
        console.log('❌ No local data available for offline validation');
        return false;
      }
    }

    // Online validation
    try {
      // Try to get fresh user data from Firebase Auth
      await user.reload();
      console.log('✅ Firebase Auth user still valid');

      // Check if user data exists in Firestore
      const userData = await getUserFromAsyncStorage();

      if (userData?.phoneNumber) {
        // ---------------------------------------------------------
        // Grace period: if provisional login just occurred and we
        // haven't yet assigned role/profile, don't clear session.
        // Prevents first-login race causing auto logout.
        // ---------------------------------------------------------
        try {
          const graceUntilStr = await AsyncStorage.getItem('initialValidationGraceUntil');
          const now = Date.now();
          if (graceUntilStr) {
            const graceUntil = parseInt(graceUntilStr, 10);
            if (!userData.userRole && now < graceUntil) {
              console.log('⏳ In initial validation grace window; skipping destructive checks');
              return true; // allow navigation to proceed until role stored
            }
          }
        } catch (graceErr) {
          console.warn('Grace period read failed:', graceErr);
        }
        try {
          // Check in Firestore using phone number to ensure data integrity
          const firestoreCheck = await checkUserExistsInFirestore(userData.phoneNumber);

          if (firestoreCheck.exists && firestoreCheck.userData) {
            console.log('✅ User data still exists in Firestore');

            // Update offline auth state with fresh data
            await saveOfflineAuthState(firestoreCheck.userData);

            return true;
          } else {
            console.log('❌ User data not found in Firestore, may have been deleted');
            await clearUserData();
            await clearOfflineAuthState();
            return false;
          }
        } catch (firestoreError) {
          const errorResult = await handleNetworkError(firestoreError, 'firestore_validation');
          if (errorResult.isNetworkError) {
            console.log('📱 Firestore validation failed due to network, allowing offline access');
            return true; // Allow access during network issues
          } else {
            throw firestoreError;
          }
        }
      }

      // Also try standard profile check for backward compatibility
      try {
        const profile = await getCompleteUserProfile(true); // Force refresh

        if (!profile) {
          // Re-check grace period before clearing
          try {
            const graceUntilStr = await AsyncStorage.getItem('initialValidationGraceUntil');
            const now = Date.now();
            if (graceUntilStr) {
              const graceUntil = parseInt(graceUntilStr, 10);
              if (now < graceUntil) {
                console.log('⏳ Profile missing but within grace period – deferring cleanup');
                return true;
              }
            }
          } catch (graceErr) {
            console.warn('Grace period check failed:', graceErr);
          }
          console.log('❌ User profile not found (post-grace), clearing data');
          await clearUserData();
          await clearOfflineAuthState();
          return false;
        }

        console.log('✅ User validation successful');
        return true;
      } catch (profileError) {
        const errorResult = await handleNetworkError(profileError, 'profile_validation');
        if (errorResult.isNetworkError) {
          console.log('📱 Profile validation failed due to network, allowing offline access');
          return true;
        } else {
          throw profileError;
        }
      }

    } catch (reloadError) {
      // If reload fails, the user has likely been deleted from Firebase Auth
      console.error('❌ User reload failed:', reloadError);

      const errorResult = await handleNetworkError(reloadError, 'auth_reload');
      if (errorResult.isNetworkError) {
        console.log('📱 Auth reload failed due to network, allowing offline access');
        return true;
      } else {
        // Check with persistent auth manager before clearing data
        const authResult = await persistentAuthManager.handleAuthError(reloadError, 'user_validation');
        if (authResult.shouldLogout) {
          console.log('🚪 Persistent auth determined logout required:', authResult.reason);
          await clearUserData();
          await clearOfflineAuthState();
          return false;
        } else {
          console.log('🔒 Maintaining session despite reload error:', authResult.reason);
          return true;
        }
      }
    }

  } catch (error) {
    console.error('❌ User validation failed:', error);

    const errorResult = await handleNetworkError(error, 'user_validation');
    if (errorResult.isNetworkError) {
      console.log('📱 Validation failed due to network error, allowing offline access');
      return true;
    } else {
      // Check with persistent auth manager before clearing data
      const authResult = await persistentAuthManager.handleAuthError(error, 'general_validation');
      if (authResult.shouldLogout) {
        console.log('🚪 Persistent auth determined logout required:', authResult.reason);
        await clearUserData();
        await clearOfflineAuthState();
        return false;
      } else {
        console.log('🔒 Maintaining session despite validation error:', authResult.reason);
        return true;
      }
    }
  }
};

/**
 * Check if user data exists in Firestore for a given phone number
 * (Unified) Previously checked farmers & buyers; now only queries 'profiles'
 * @param {string} phoneNumber - User's phone number (with country code)
 * @returns {Promise<{exists: boolean, userData: object|null, collection: string|null}>}
 */
export const checkUserExistsInFirestore = async (phoneNumber) => {
  try {
    console.log('🔍 Checking if user exists (profiles) by phone number:', phoneNumber);
    const profilesRef = collection(firebaseFirestore, COLLECTIONS.PROFILES);
    const q = query(profilesRef, where('phoneNumber', '==', phoneNumber), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      console.log('✅ User found in profiles collection:', userData.uid);
      return { exists: true, userData, collection: COLLECTIONS.PROFILES };
    }
    console.log('❌ User not found in profiles');
    return { exists: false, userData: null, collection: null };
  } catch (error) {
    console.error('❌ Error checking if user exists in unified profiles collection:', error);
    return { exists: false, userData: null, collection: null, error };
  }
};

/**
 * Ensure Firestore collection exists by creating a dummy doc if needed
 * @param {string} collectionName
 * @returns {Promise<void>}
 */
const ensureCollectionExists = async () => {
  try {
    const collectionName = COLLECTIONS.PROFILES;
    const refCol = collection(firebaseFirestore, collectionName);
    const q = query(refCol, limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const initRef = doc(firebaseFirestore, collectionName, '.__init__');
      await setDoc(initRef, { createdAt: firestoreServerTimestamp(), note: 'init placeholder - safe to delete' });
      console.log('✅ Initialized profiles collection with placeholder');
    }
  } catch (error) {
    console.error('❌ Error ensuring profiles collection exists:', error);
  }
};