/**
 * User Role Storage Utility
 * Manages user role in localStorage with Firestore synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../constants';
import { getCompleteUserProfile, updateUserInFirestore } from '../services/firebaseService';
import { auth as modularAuth } from '../config/firebaseModular';

export type UserRole = 'farmer' | 'buyer';

// Single auth instance (avoid mixing legacy config). If undefined, we'll handle defensively.
const authInstance = modularAuth as any;

const getUid = (): string | undefined => {
  try {
    return authInstance?.currentUser?.uid;
  } catch {
    return undefined;
  }
};

/**
 * Save user role to storage (scoped per UID + legacy key)
 */
export const saveUserRole = async (role: UserRole): Promise<void> => {
  try {
    const uid = getUid();
    if (uid) {
      await AsyncStorage.setItem(`${StorageKeys.USER_ROLE}:${uid}`, role);
      await AsyncStorage.setItem(StorageKeys.USER_ROLE, role); // legacy
    } else {
      await AsyncStorage.setItem(StorageKeys.USER_ROLE, role);
    }
  } catch (error) {
    console.error('❌ Failed to save user role:', error);
    throw error;
  }
};

/**
 * Get user role from localStorage
 * @returns User role or null if not found
 */
export const getUserRole = async (): Promise<UserRole | null> => {
  try {
    const uid = getUid();
    if (uid) {
      const roleForUid = await AsyncStorage.getItem(`${StorageKeys.USER_ROLE}:${uid}`);
      if (roleForUid) return roleForUid as UserRole;
    }
    const legacyRole = await AsyncStorage.getItem(StorageKeys.USER_ROLE);
    return legacyRole as UserRole | null;
  } catch (error) {
    console.error('❌ Failed to get user role:', error);
    return null;
  }
};

/**
 * Clear user role from localStorage
 */
export const clearUserRole = async (): Promise<void> => {
  try {
    const uid = getUid();
    if (uid) await AsyncStorage.removeItem(`${StorageKeys.USER_ROLE}:${uid}`);
    await AsyncStorage.removeItem(StorageKeys.USER_ROLE);
  } catch (error) {
    console.error('❌ Failed to clear user role:', error);
  }
};

/**
 * Synchronize user role between localStorage and Firestore
 * Priority: Firestore role takes precedence when localStorage is empty
 * @returns Updated user role
 */
export const syncUserRole = async (): Promise<UserRole | null> => {
  try {
    const uid = getUid();
    if (!uid) {
      return null;
    }

    const localRole = await getUserRole();
    const userProfile = await getCompleteUserProfile();
    const firestoreRole = (userProfile as any)?.userRole as UserRole | undefined;


    if (!localRole && firestoreRole) {
      await saveUserRole(firestoreRole);
      return firestoreRole;
    }

    if (localRole && firestoreRole && localRole === firestoreRole) {
      return localRole;
    }

    if (localRole && firestoreRole && localRole !== firestoreRole) {
      await saveUserRole(firestoreRole);
      return firestoreRole;
    }

    if (localRole && !firestoreRole) {
      try {
        await updateUserInFirestore(uid, localRole, { userRole: localRole });
      } catch (err) {
        console.error('❌ Failed pushing local role to Firestore:', err);
      }
      return localRole;
    }

    return null;
  } catch (error) {
    console.error('❌ Error syncing user role:', error);
    return await getUserRole();
  }
};

/**
 * Initialize user role from AsyncStorage userData for backward compatibility
 * This helps migrate existing users to the new role storage system
 */
export const initializeUserRoleFromUserData = async (): Promise<UserRole | null> => {
  try {
    // Check if role is already set in dedicated storage
    const existingRole = await getUserRole();
    if (existingRole) {
      return existingRole;
    }

    // Try to get role from userData for backward compatibility
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsedData = JSON.parse(userData);
      if (parsedData.userRole && ['farmer', 'buyer'].includes(parsedData.userRole)) {
        await saveUserRole(parsedData.userRole);
        return parsedData.userRole;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error initializing user role:', error);
    return null;
  }
};
