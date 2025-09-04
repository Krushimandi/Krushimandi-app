import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateCurrentUser } from '../services/firebaseService';
import { clearUserRole } from './userRoleStorage';

export interface AuthStep {
  step: string;
  completed: boolean;
  route: string;
}

export interface UserAuthState {
  isAuthenticated: boolean;
  phoneVerified: boolean;
  roleSelected: boolean;
  profileCompleted: boolean;
  currentStep: string;
  nextRoute: string;
}

/**
 * Check if phone number is verified
 */
export const isPhoneVerified = async (): Promise<boolean> => {
  try {
    // First check Firebase user
    const user = auth().currentUser;
    if (user && user.phoneNumber) {
      console.log('✅ Phone verified via Firebase user:', user.phoneNumber);
      return true;
    }

    // If no Firebase user, check AsyncStorage for verification status
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const userProfile = JSON.parse(userData);
      if (userProfile.phoneNumber && userProfile.uid) {
        console.log('✅ Phone verified via AsyncStorage:', userProfile.phoneNumber);
        return true;
      }
    }

    // Check if auth step indicates phone verification completed
    const authStep = await AsyncStorage.getItem('authStep');
    if (authStep && (authStep === 'RoleSelected' || authStep === 'Complete')) {
      console.log('✅ Phone verified via auth step:', authStep);
      return true;
    }

    console.log('❌ Phone not verified');
    return false;
  } catch (error) {
    console.error('Error checking phone verification:', error);
    return false;
  }
};

/**
 * Check if user role is selected
 */
export const isRoleSelected = async (): Promise<boolean> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    console.log('🔍 Checking role selection - userData:', userData ? 'Found' : 'Not found');

    if (userData) {
      const user = JSON.parse(userData);
      // Guard against stale data from previous session: ensure it belongs to current Firebase user
      const currentUser = auth().currentUser;
      if (currentUser && user?.uid && user.uid !== currentUser.uid) {
        console.log('⚠️ Stale userData detected (UID mismatch). Ignoring cached role.', {
          cachedUid: user.uid,
          currentUid: currentUser.uid
        });
        return false;
      }
      console.log('🔍 User role from AsyncStorage:', user.userRole);
      const isValid = !!(user.userRole && ['farmer', 'buyer'].includes(user.userRole));
      console.log('🔍 Role selection valid:', isValid);
      return isValid;
    }
    console.log('❌ No userData found in AsyncStorage');
    return false;
  } catch (error) {
    console.error('Error checking role selection:', error);
    return false;
  }
};

/**
 * Check if profile is completed (first name, last name)
 */
export const isProfileCompleted = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking profile completion...');

    // First check AsyncStorage for profile completion flag
    const userData = await AsyncStorage.getItem('userData');
    console.log('  - AsyncStorage userData:', userData ? 'Found' : 'Not found');

    if (userData) {
      const userProfile = JSON.parse(userData);

      // Ensure the cached profile belongs to the current Firebase user to avoid cross-account leakage
      const currentUser = auth().currentUser;
      if (currentUser && userProfile?.uid && userProfile.uid !== currentUser.uid) {
        console.log('⚠️ Stale profile data detected (UID mismatch). Skipping cached profile.', {
          cachedUid: userProfile.uid,
          currentUid: currentUser.uid
        });
      } else {
        // Check if profile is marked as complete in local storage
        if (userProfile.isProfileComplete === true) {
          console.log('✅ Profile marked as complete in AsyncStorage');
          return true;
        }

  // continue to other profile checks

        // Check if we have all required profile data locally
        const hasFirstName = !!(userProfile.firstName && userProfile.firstName.trim());
        const hasLastName = !!(userProfile.lastName && userProfile.lastName.trim());
        const hasRole = !!(userProfile.userRole && ['farmer', 'buyer'].includes(userProfile.userRole));

        if (hasFirstName && hasLastName && hasRole) {
          console.log('✅ Profile data complete in AsyncStorage:', {
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            userRole: userProfile.userRole
          });
          return true;
        }

        // If we have partial data but Firebase user is missing, still consider it incomplete
        console.log('⚠️ Partial profile data in AsyncStorage:', {
          hasFirstName,
          hasLastName,
          hasRole,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          userRole: userProfile.userRole
        });
      }
    }

    // Check Firebase user (as fallback or additional validation)
    const user = auth().currentUser;
    console.log('  - Firebase user:', user ? user.uid : 'None');

    if (user) {
      // Check Firebase Auth profile
      const hasDisplayName = !!(user.displayName && user.displayName.trim());

      console.log('🔍 Firebase profile check:', {
        hasDisplayName,
        displayName: user.displayName
      });

      // If Firebase has display name, consider profile complete
      if (hasDisplayName) {
        console.log('✅ Profile complete based on Firebase displayName');
        return true;
      }
    }

    console.log('❌ Profile not complete - missing data in both AsyncStorage and Firebase');
    return false;

  } catch (error) {
    console.error('Error checking profile completion:', error);
    return false;
  }
};

/**
 * Check if buyer has selected preferred fruits (used to gate Buyer onboarding)
 */
export const hasBuyerSelectedFruits = async (): Promise<boolean> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) return false;

    const parsed = JSON.parse(userData);
    const role = parsed?.userRole;
    if (role !== 'buyer') return true; // Not a buyer, this step doesn't apply

    const fruits = parsed?.PreferedFruits;
    return Array.isArray(fruits) && fruits.length > 0;
  } catch (e) {
    console.warn('Error checking buyer fruits selection:', e);
    return false;
  }
};

/**
 * Validate if current Firebase user still exists on server
 */
export const validateFirebaseUser = async (): Promise<boolean> => {
  try {
    const user = auth().currentUser;
    if (!user) {
      console.log('⚠️ No Firebase user found locally - may need re-authentication');
      return false;
    }

    // Use the validateCurrentUser function from firebaseService
    const isValid = await validateCurrentUser();
    return isValid;
  } catch (error) {
    console.error('❌ Error validating Firebase user:', error);
    // If validation fails, assume user is still valid to avoid blocking auth flow
    return true;
  }
};

/**
 * Set authentication step
 */
export const setAuthStep = async (step: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('authStep', step);
    console.log('✅ Auth step set to:', step);
    
    // Small delay to ensure AsyncStorage write is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Notify auth state manager of the change
    const { authStateManager } = await import('./authStateManager');
    authStateManager.refreshAuthState();
  } catch (error) {
    console.error('Error setting auth step:', error);
  }
};

/**
 * Check if all authentication steps are completed
 */
export const isAuthComplete = async (): Promise<boolean> => {
  try {
    const authStep = await AsyncStorage.getItem('authStep');
    return authStep === 'Complete';
  } catch (error) {
    console.error('Error checking auth completion:', error);
    return false;
  }
};

/**
 * Get the current authentication state and determine next route
 */
export const getAuthState = async (): Promise<UserAuthState> => {
  try {
    console.log('🔍 Getting authentication state...');

    // Check each step (all async now) - don't require Firebase user for initial checks
    const phoneVerified = await isPhoneVerified();
    const roleSelected = await isRoleSelected();
    const profileCompleted = await isProfileCompleted();
    const fruitsSelected = await hasBuyerSelectedFruits();
    const authComplete = await isAuthComplete();

    console.log('📊 Auth state components:', {
      phoneVerified,
      roleSelected,
      profileCompleted,
      fruitsSelected,
      authComplete
    });

    // If all steps are complete, go to main app
    if (phoneVerified && roleSelected && profileCompleted && authComplete) {
      console.log('✅ All auth steps complete, checking Firebase user...');
      
      // Check if we have a Firebase user
      const user = auth().currentUser;
      if (user) {
        console.log('✅ Firebase user confirmed, going to Main');
        return {
          isAuthenticated: true,
          phoneVerified: true,
          roleSelected: true,
          profileCompleted: true,
          currentStep: 'complete',
          nextRoute: 'Main'
        };
      } else {
        // Even if Firebase user is missing, if we have complete auth state,
        // try to restore from AsyncStorage and continue
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const userProfile = JSON.parse(userData);
          // Do NOT trust cached user if there's no current Firebase user; force re-auth to avoid wrong stack
          console.log('⚠️ Auth complete but Firebase user missing - requiring re-auth to avoid stale routing');
        }
        
        console.log('❌ Auth steps complete but no valid user data - restarting auth');
      }
    }

    // Now check Firebase user for validation if we have partial auth state
    const user = auth().currentUser;
    console.log('  - Firebase user:', user ? user.uid : 'None');

    // If we have partial progress but no Firebase user, validate if user still exists
  if ((phoneVerified || roleSelected || profileCompleted) && !user) {
      console.log('⚠️ Partial auth state detected but no Firebase user - may need re-authentication');

      // Check if we have a valid user in AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const userProfile = JSON.parse(userData);
    if (userProfile.uid) {
          console.log('⚠️ Found user UID in AsyncStorage, but Firebase user missing. Auth may have expired.');
          // Reset auth state and restart from welcome
          return {
            isAuthenticated: false,
            phoneVerified: false,
            roleSelected: false,
            profileCompleted: false,
            currentStep: 'welcome',
            nextRoute: 'Auth'
          };
        }
      }
    }

  // Determine which step to resume from - but always route to 'Auth' container
    let currentStep = 'welcome';
    // Always go to Auth container, let AuthNavigator handle internal routing
    let nextRoute = 'Auth';

    // Step 1: Phone verification through Welcome Screen (must be first)
    if (!phoneVerified) {
      currentStep = 'welcome';
      console.log('📱 Resuming from welcome');
    }
    // Step 2: Role selection (only if phone is verified)
    else if (phoneVerified && !roleSelected) {
      currentStep = 'role_selection';
      console.log('👤 Resuming from role selection');
    }
    // Step 3: Profile completion (only if phone verified AND role selected)
    else if (phoneVerified && roleSelected && !profileCompleted) {
      currentStep = 'profile_setup';
      console.log('📝 Resuming from profile setup');
    }
    // Step 3b: Buyer fruits selection (only if profile is complete already)
    else if (phoneVerified && roleSelected) {
      // Check for buyer-specific fruits step when authStep is not complete
      const userData = await AsyncStorage.getItem('userData');
      const authStep = await AsyncStorage.getItem('authStep');
      const role = (() => { try { return userData ? JSON.parse(userData)?.userRole : null; } catch { return null; }})();
      if (role === 'buyer' && !authComplete && profileCompleted && !fruitsSelected) {
        currentStep = 'fruits_selection';
        console.log('🍎 Resuming from fruits selection');
      }
    }
    // Step 4: If all main steps are complete, go to main app
    else if (phoneVerified && roleSelected && profileCompleted) {
      console.log('✅ All main auth steps complete - validating user binding before main app');
      const fbUser = auth().currentUser;
      if (fbUser) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const userProfile = JSON.parse(userData);
          if (userProfile?.uid && userProfile.uid !== fbUser.uid) {
            console.log('⚠️ UID mismatch between AsyncStorage and Firebase - restarting auth to avoid wrong routing', {
              cachedUid: userProfile.uid,
              currentUid: fbUser.uid
            });
            return {
              isAuthenticated: false,
              phoneVerified: false,
              roleSelected: false,
              profileCompleted: false,
              currentStep: 'welcome',
              nextRoute: 'Auth'
            };
          }
        }
      }
      // If buyer fruits not selected and auth step not marked complete, route to fruits selection
      if (!authComplete && !fruitsSelected) {
        return {
          isAuthenticated: true,
          phoneVerified: true,
          roleSelected: true,
          profileCompleted: true,
          currentStep: 'fruits_selection',
          nextRoute: 'Auth'
        };
      }
      return {
        isAuthenticated: true,
        phoneVerified: true,
        roleSelected: true,
        profileCompleted: true,
        currentStep: 'complete',
        nextRoute: 'Main'
      };
    }
    // Fallback: unexpected state
    else {
      currentStep = 'welcome';
      console.log('⚠️ Unexpected auth state, going to welcome');
    }

    return {
      isAuthenticated: phoneVerified,
      phoneVerified,
      roleSelected,
      profileCompleted,
      currentStep,
      nextRoute
    };

  } catch (error) {
    console.error('❌ Error in getAuthState:', error);
    return {
      isAuthenticated: false,
      phoneVerified: false,
      roleSelected: false,
      profileCompleted: false,
      currentStep: 'welcome',
      nextRoute: 'Auth'
    };
  }
};

/**
 * Debug function to print current auth state
 */
export const debugAuthState = async (): Promise<void> => {
  try {
    console.log('\n=== AUTH STATE DEBUG ===');

    const user = auth().currentUser;
    console.log('Firebase User:', user ? {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      photoURL: user.photoURL
    } : 'None');

    const userData = await AsyncStorage.getItem('userData');
    console.log('AsyncStorage userData:', userData ? JSON.parse(userData) : 'None');

    const authStep = await AsyncStorage.getItem('authStep');
    console.log('Auth Step:', authStep || 'None');

    const phoneVerified = isPhoneVerified();
    const roleSelected = await isRoleSelected();
    const profileCompleted = await isProfileCompleted();
    const authComplete = await isAuthComplete();

    console.log('Auth Checks:', {
      phoneVerified,
      roleSelected,
      profileCompleted,
      authComplete
    });

    const authState = await getAuthState();
    console.log('Final Auth State:', authState);

    console.log('=== END AUTH DEBUG ===\n');
  } catch (error) {
    console.error('Error in debugAuthState:', error);
  }
};

/**
 * Clear all auth data (for logout)
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    console.log('🧹 Starting comprehensive auth data cleanup...');
    
    // Import StorageKeys for consistency
    const { StorageKeys, SecureStorageKeys } = await import('../constants/AppConstants');
    
    // Clear AsyncStorage keys - comprehensive list of all possible auth-related keys
    const keysToRemove = [
      // Main StorageKeys
      StorageKeys.USER_TOKEN,
      StorageKeys.USER_DATA,
      StorageKeys.USER_ROLE,
      
      // Legacy/additional auth keys (maintain backward compatibility)
      'userData',
      'user_role', 
      'auth_state',
      'authStep',
      'userRole',
      'lastLoginTime',
      'authToken',
      'isAuthenticated',
      'bootstrapAuth',
      '@auth:token',
      '@auth:user',
      '@auth:state',
    ];
    
    // Also clear secure storage keys
    try {
      const { secureStorage } = await import('./secureStorage');
      await secureStorage.clearAll();
      console.log('✅ Secure storage cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear secure storage:', error);
    }
    
    // Remove duplicates and filter out undefined values
    const uniqueKeysToRemove = [...new Set(keysToRemove.filter(Boolean))];
    
    console.log('🗑️ Removing AsyncStorage keys:', uniqueKeysToRemove);
    await AsyncStorage.multiRemove(uniqueKeysToRemove);
    
    // Clear user role using the dedicated function
    await clearUserRole();
    
    console.log('✅ Comprehensive auth data cleared from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    throw error;
  }
};
