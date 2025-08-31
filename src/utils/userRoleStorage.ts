/**
 * User Role Storage Utility
 * Manages user role in localStorage with Firestore synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../constants';
import { getCompleteUserProfile, updateUserInFirestore } from '../services/firebaseService';
import { auth } from '../config/firebase';

export type UserRole = 'farmer' | 'buyer';

/**
 * Save user role to localStorage
 * @param role - User role to save
 */
export const saveUserRole = async (role: UserRole): Promise<void> => {
  try {
    const uid = auth.currentUser?.uid;
    if (uid) {
      await AsyncStorage.setItem(`${StorageKeys.USER_ROLE}:${uid}`, role);
      // Also set plain key for backward compatibility
      await AsyncStorage.setItem(StorageKeys.USER_ROLE, role);
      console.log('✅ User role saved to localStorage with UID binding:', { role, uid });
    } else {
      await AsyncStorage.setItem(StorageKeys.USER_ROLE, role);
      console.log('⚠️ No UID, saved role without UID binding:', role);
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
    const uid = auth.currentUser?.uid;
    if (uid) {
      const roleForUid = await AsyncStorage.getItem(`${StorageKeys.USER_ROLE}:${uid}`);
      if (roleForUid) return roleForUid as UserRole;
    }
    // Fallback to legacy key
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
    const uid = auth.currentUser?.uid;
    if (uid) {
      await AsyncStorage.removeItem(`${StorageKeys.USER_ROLE}:${uid}`);
    }
    await AsyncStorage.removeItem(StorageKeys.USER_ROLE);
    console.log('✅ User role cleared from localStorage');
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
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user for role sync');
      return null;
    }

    // Get role from localStorage
    const localRole = await getUserRole();
    
    // Get user profile from Firestore
    const userProfile = await getCompleteUserProfile();
    const firestoreRole = (userProfile as any)?.userRole;

    console.log('🔄 Role sync check:', {
      localRole,
      firestoreRole,
      userId: user.uid
    });

    // If Firestore has a role and localStorage doesn't, adopt Firestore (server is source of truth)
    if (!localRole && firestoreRole) {
      await saveUserRole(firestoreRole);
      console.log('✅ Role synced from Firestore to localStorage:', firestoreRole);
      return firestoreRole;
    }

    // If both exist and match, nothing to do
    if (localRole && firestoreRole && localRole === firestoreRole) {
      console.log('✅ Roles already in sync:', localRole);
      return localRole;
    }

    // If both exist and differ, prefer Firestore role to avoid propagating stale local role
    if (localRole && firestoreRole && localRole !== firestoreRole) {
      await saveUserRole(firestoreRole);
      console.log('⚠️ Role mismatch detected. Adopted Firestore role over local:', {
        localRole,
        firestoreRole
      });
      return firestoreRole;
    }

    // If localStorage has role but Firestore doesn't, update Firestore from local
    if (localRole && !firestoreRole) {
      try {
        await updateUserInFirestore(user.uid, localRole, { userRole: localRole });
        console.log('✅ Role synced from localStorage to Firestore:', localRole);
      } catch (error) {
        console.error('❌ Failed to sync role to Firestore:', error);
        // Continue with localStorage role even if Firestore update fails
      }
      return localRole;
    }

    // If only localStorage has role (shouldn't happen in normal flow)
    if (localRole && !firestoreRole) {
      console.log('⚠️ Only localStorage has role, keeping it:', localRole);
      return localRole;
    }

    // If neither exists, return null
    console.log('❌ No role found in either localStorage or Firestore');
    return null;

  } catch (error) {
    console.error('❌ Error syncing user role:', error);
    // Fallback to localStorage role if sync fails
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
        console.log('✅ Migrated user role from userData to dedicated storage:', parsedData.userRole);
        return parsedData.userRole;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error initializing user role:', error);
    return null;
  }
};
