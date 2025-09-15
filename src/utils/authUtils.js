import { auth } from '../config/firebaseModular';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompleteUserProfile, clearUserData, updateLastLogin, validateUserProfileCompleteness, validateCurrentUser } from '../services/firebaseService';
import { clearUserRole } from './userRoleStorage';

/**
 * Get current authenticated user information from Firebase Auth
 * @returns {Object|null} User information or null if not authenticated
 */
export const getCurrentUser = () => {
  const user = auth.currentUser;
  if (user) {
    return {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
    };
  }
  return null;
};

/**
 * Get complete user profile data (Firebase + AsyncStorage)
 * @param {boolean} forceRefresh - Force refresh from Firestore
 * @returns {Promise<Object|null>} User profile data or null
 */
export const getUserProfile = async (forceRefresh = false) => {
  return await getCompleteUserProfile(forceRefresh);
};

/**
 * Update user's last login time
 * @returns {Promise<void>}
 */
export const updateUserLastLogin = async () => {
  try {
    const profile = await getUserProfile();
    if (profile?.uid && profile?.userRole) {
      await updateLastLogin(profile.uid, profile.userRole);
    }
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
};
/**
 * Update user profile in Firebase Auth and AsyncStorage
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<boolean>} Success status
 */
export const updateUserProfile = async (profileData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Update Firebase Auth profile
    const updateData = {};
    if (profileData.displayName) {
      updateData.displayName = profileData.displayName;
    }
    if (profileData.photoURL) {
      updateData.photoURL = profileData.photoURL;
    }

    if (Object.keys(updateData).length > 0) {
      await user.updateProfile(updateData);
    }

    // Update local storage
    const existingUserData = await getUserProfile();
    const updatedUserData = {
      ...existingUserData,
      ...profileData,
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};
/**
 * Get user's first and last name from display name
 * @param {string} displayName - Full display name
 * @returns {Object} Object with firstName and lastName
 */
export const parseDisplayName = (displayName) => {
  if (!displayName) {
    return { firstName: '', lastName: '' };
  }
  
  const nameParts = displayName.trim().split(' ');
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
  };
};

/**
 * Check if user authentication is complete
 * @returns {Promise<boolean>} True if auth is complete
 */
export const isAuthComplete = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // First validate if the user still exists on Firebase server
    const isValidUser = await validateCurrentUser();
    if (!isValidUser) {
      console.log('❌ User validation failed in isAuthComplete');
      return false;
    }
    
    // Use the comprehensive validation function
    const validation = await validateUserProfileCompleteness(user.uid);
    
    console.log('Auth completion check:', {
      isComplete: validation.isComplete,
      missingFields: validation.missingFields,
      userRole: validation.userData?.userRole
    });
    
    return validation.isComplete;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
};

/**
 * Sign out user and clear local data
 * @returns {Promise<boolean>} Success status
 */
export const signOut = async () => {
  try {
    await auth.signOut();
    await AsyncStorage.multiRemove(['userData', 'authStep']);
    await clearUserRole();
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};
