import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { clearUserRole } from '../utils/userRoleStorage';

/**
 * Firebase Service for User Management
 * Handles Firestore, Storage, and AsyncStorage synchronization
 */

// Collection names based on user roles
const COLLECTIONS = {
  FARMERS: 'farmers',
  BUYERS: 'buyers',
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

/**
 * Get collection name based on user role
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {string} Collection name
 */
const getCollectionName = (userRole) => {
  return userRole === 'farmer' ? COLLECTIONS.FARMERS : COLLECTIONS.BUYERS;
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

    const collection = getCollectionName(userData.userRole);
    await ensureCollectionExists(collection);

    const userDoc = {
      uid: userData.uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: `${userData.firstName} ${userData.lastName}`,
      phoneNumber: userData.phoneNumber,
      email: userData.email || null,
      userRole: userData.userRole,
      profileImage: userData.profileImage || null,
      isProfileComplete: userData.isProfileComplete || false,
      isEmailVerified: userData.isEmailVerified || false,
      isPhoneVerified: userData.isPhoneVerified || true,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firestore.FieldValue.serverTimestamp(),
      status: 'active',
      // Role-specific fields
      ...(userData.userRole === 'farmer' && {
        farmDetails: userData.farmDetails || null,
        cropTypes: userData.cropTypes || [],
        farmLocation: userData.farmLocation || null,
      }),
      ...(userData.userRole === 'buyer' && {
        businessDetails: userData.businessDetails || null,
        preferredCrops: userData.preferredCrops || [],
        businessLocation: userData.businessLocation || null,
      }),
    };

    await firestore()
      .collection(collection)
      .doc(userData.uid)
      .set(userDoc, { merge: true });

    console.log('✅ User saved to Firestore successfully');
  } catch (error) {
    console.error('❌ Failed to save user to Firestore:', error);
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

    const collection = getCollectionName(userRole);
    const userDoc = await firestore()
      .collection(collection)
      .doc(userId)
      .get();

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

    const collection = getCollectionName(userRole);
    const updates = {
      ...updateData,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection(collection)
      .doc(userId)
      .update(updates);

    console.log('✅ User updated in Firestore successfully');
  } catch (error) {
    console.error('❌ Failed to update user in Firestore:', error);
    throw new Error('Failed to update user data');
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
      email: userData.email,
      userRole: userData.userRole,
      profileImage: userData.profileImage,
      isProfileComplete: userData.isProfileComplete,
      lastSyncAt: new Date().toISOString(),
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

    const user = auth().currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Validate required fields
    if (!profileData.firstName || !profileData.lastName) {
      throw new Error('First name and last name are required');
    }

    if (!profileData.userRole || !['farmer', 'buyer'].includes(profileData.userRole)) {
      throw new Error('Valid user role (farmer/buyer) is required');
    }

    let updatedData = { ...profileData };    // 1. Upload avatar to Firebase Storage if provided
    if (profileData.avatar && profileData.avatar.startsWith('file://')) {
      console.log('📸 Uploading new avatar to Firebase Storage...');

      if (onProgress) onProgress({ step: 'uploading_avatar', message: 'Uploading profile photo...' });

      try {
        const avatarURL = await uploadProfileAvatar(
          profileData.avatar,
          user.uid,
          profileData.userRole,
          onProgress // Pass progress callback to upload function
        );
        updatedData.profileImage = avatarURL;
        console.log('✅ Avatar uploaded successfully');

        if (onProgress) onProgress({ step: 'avatar_complete', message: 'Photo uploaded successfully' });
      } catch (error) {
        console.error('❌ Avatar upload failed:', error);
        // Continue without avatar if upload fails
        updatedData.profileImage = null;
        if (onProgress) onProgress({ step: 'avatar_error', message: 'Photo upload failed, continuing...' });
      }
    }
    // 2. Update Firebase Auth profile
    console.log('🔐 Updating Firebase Auth profile...');
    if (onProgress) onProgress({ step: 'updating_auth', message: 'Updating authentication profile...' });

    await user.updateProfile({
      displayName: updatedData.displayName || `${updatedData.firstName} ${updatedData.lastName}`,
      photoURL: updatedData.profileImage,
    });

    // 3. Save/Update in Firestore
    console.log('💾 Syncing with Firestore...');
    if (onProgress) onProgress({ step: 'saving_firestore', message: 'Saving user data...' });

    const completeUserData = {
      ...updatedData,
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      email: user.email,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: true,
      displayName: updatedData.displayName || `${updatedData.firstName} ${updatedData.lastName}`,
    };

    await saveUserToFirestore(completeUserData);

    // 4. Update AsyncStorage
    console.log('💾 Updating AsyncStorage...');
    if (onProgress) onProgress({ step: 'saving_local', message: 'Saving locally...' });

    await saveUserToAsyncStorage(completeUserData);

    console.log('✅ User profile sync completed successfully!');
    if (onProgress) onProgress({ step: 'complete', message: 'Profile saved successfully!' });

    return true;
  } catch (error) {
    console.error('❌ User profile sync failed:', error);

    if (onProgress) onProgress({ step: 'error', message: `Error: ${error.message}` });

    Alert.alert(
      'Sync Error',
      `Failed to save profile data: ${error.message}. Please check your internet connection and try again.`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Get complete user profile from multiple sources
 * @param {boolean} forceRefresh - Force refresh from Firestore
 * @returns {Promise<object|null>} Complete user profile
 */
export const getCompleteUserProfile = async (forceRefresh = false) => {
  try {
    console.log('📖 Getting complete user profile...');

    const user = auth().currentUser;
    if (!user) {
      console.log('❌ No authenticated user');
      return null;
    }

    // Try AsyncStorage first for speed
    if (!forceRefresh) {
      const localData = await getUserFromAsyncStorage();
      if (localData && localData.uid === user.uid) {
        console.log('✅ User profile loaded from AsyncStorage');
        return localData;
      }
    }

    // Try to get user role from AsyncStorage
    const authStep = await AsyncStorage.getItem('authStep');
    const localData = await getUserFromAsyncStorage();
    const userRole = localData?.userRole;

    if (userRole) {
      // Get from Firestore and update AsyncStorage
      const firestoreData = await getUserFromFirestore(user.uid, userRole);
      if (firestoreData) {
        await saveUserToAsyncStorage(firestoreData);
        console.log('✅ User profile loaded from Firestore and cached');
        return firestoreData;
      }
    }

    console.log('❌ User profile not found');
    return null;

  } catch (error) {
    console.error('❌ Failed to get complete user profile:', error);
    return null;
  }
};

/**
 * Update last login time
 * @param {string} userId - User UID
 * @param {string} userRole - 'farmer' or 'buyer'
 * @returns {Promise<void>}
 */
export const updateLastLogin = async (userId, userRole) => {
  try {
    await updateUserInFirestore(userId, userRole, {
      lastLoginAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('❌ Failed to update last login:', error);
  }
};

/**
 * Clear all user data (for logout)
 * @returns {Promise<void>}
 */
export const clearUserData = async () => {
  try {
    console.log('🗑️ Clearing user data...');

    await AsyncStorage.multiRemove(['userData', 'authStep']);
    await auth().signOut();

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

    const user = auth().currentUser;
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
    const user = auth().currentUser;

    console.log('=== USER DATA DEBUG ===');
    console.log('Firebase Auth User:', user ? {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
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
 * @returns {Promise<boolean>} True if user is valid
 */
export const validateCurrentUser = async () => {
  try {
    const user = auth().currentUser;
    if (!user) {
      console.log('❌ No current user found');
      return false;
    }

    console.log('🔍 Validating current user...', user.uid);

    try {
      // Try to get fresh user data from Firebase Auth
      await user.reload();
      console.log('✅ Firebase Auth user still valid');
      
      // Check if user data exists in Firestore
      const userData = await getUserFromAsyncStorage();
      
      if (userData?.phoneNumber) {
        // Check in Firestore using phone number to ensure data integrity
        const firestoreCheck = await checkUserExistsInFirestore(userData.phoneNumber);
        
        if (firestoreCheck.exists && firestoreCheck.userData) {
          console.log('✅ User data still exists in Firestore');
          return true;
        } else {
          console.log('❌ User data not found in Firestore, may have been deleted');
          await clearUserData();
          return false;
        }
      }
      
      // Also try standard profile check for backward compatibility
      const profile = await getCompleteUserProfile(true); // Force refresh
      
      if (!profile) {
        console.log('❌ User profile not found, user data may have been deleted');
        await clearUserData();
        return false;
      }
      
      console.log('✅ User validation successful');
      return true;
    } catch (reloadError) {
      // If reload fails, the user has likely been deleted from Firebase Auth
      console.error('❌ User reload failed:', reloadError);
      await clearUserData();
      return false;
    }

  } catch (error) {
    console.error('❌ User validation failed:', error);
    console.log('🗑️ User likely deleted from Firebase, clearing local data');

    // Clear all user data since user is invalid
    await clearUserData();
    return false;
  }
};

/**
 * Check if user data exists in Firestore for a given phone number
 * This function tries to locate a user document in both farmers and buyers collections
 * @param {string} phoneNumber - User's phone number (with country code)
 * @returns {Promise<{exists: boolean, userData: object|null, collection: string|null}>}
 */
export const checkUserExistsInFirestore = async (phoneNumber) => {
  try {
    console.log('🔍 Checking if user exists in Firestore by phone number:', phoneNumber);
    
    // Check in farmers collection
    let snapshot = await firestore()
      .collection(COLLECTIONS.FARMERS)
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      console.log('✅ User found in farmers collection:', userData.uid);
      return { exists: true, userData, collection: COLLECTIONS.FARMERS };
    }
    
    // Check in buyers collection
    snapshot = await firestore()
      .collection(COLLECTIONS.BUYERS)
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      console.log('✅ User found in buyers collection:', userData.uid);
      return { exists: true, userData, collection: COLLECTIONS.BUYERS };
    }
    
    console.log('❌ User not found in any collection');
    return { exists: false, userData: null, collection: null };
  } catch (error) {
    console.error('❌ Error checking if user exists in Firestore:', error);
    return { exists: false, userData: null, collection: null, error };
  }
};

/**
 * Ensure Firestore collection exists by creating a dummy doc if needed
 * @param {string} collectionName
 * @returns {Promise<void>}
 */
const ensureCollectionExists = async (collectionName) => {
  try {
    const snapshot = await firestore()
      .collection(collectionName)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Collection is empty, create a dummy document
      await firestore()
        .collection(collectionName)
        .doc('dummyDoc')
        .set({ createdAt: firestore.FieldValue.serverTimestamp() });
      console.log(`✅ Dummy document created in ${collectionName} collection`);
    } else {
      console.log(`✅ ${collectionName} collection already exists`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring ${collectionName} collection exists:`, error);
  }
};