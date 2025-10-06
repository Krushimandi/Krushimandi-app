import { auth } from '../config/firebaseModular';
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
  const user = auth.currentUser;
    if (user && user.phoneNumber) {
      return true;
    }

    // If no Firebase user, check AsyncStorage for verification status
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const userProfile = JSON.parse(userData);
      if (userProfile.phoneNumber && userProfile.uid) {
        return true;
      }
    }

    // Check if auth step indicates phone verification completed
    const authStep = await AsyncStorage.getItem('authStep');
    if (authStep && (authStep === 'RoleSelected' || authStep === 'Complete')) {
      return true;
    }
    
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

    if (userData) {
      const user = JSON.parse(userData);
      // Guard against stale data from previous session: ensure it belongs to current Firebase user
  const currentUser = auth.currentUser;
      if (currentUser && user?.uid && user.uid !== currentUser.uid) {
        return false;
      }
      const isValid = !!(user.userRole && ['farmer', 'buyer'].includes(user.userRole));
      return isValid;
    }
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
    

    // First check AsyncStorage for profile completion flag
  const userData = await AsyncStorage.getItem('userData');

    if (userData) {
      const userProfile = JSON.parse(userData);

      // Ensure the cached profile belongs to the current Firebase user to avoid cross-account leakage
  const currentUser = auth.currentUser;
      if (currentUser && userProfile?.uid && userProfile.uid !== currentUser.uid) {
      } else {
        // Check if profile is marked as complete in local storage
        if (userProfile.isProfileComplete === true) {
          return true;
        }

  // continue to other profile checks

        // Check if we have all required profile data locally
        const hasFirstName = !!(userProfile.firstName && userProfile.firstName.trim());
        const hasLastName = !!(userProfile.lastName && userProfile.lastName.trim());
        const hasRole = !!(userProfile.userRole && ['farmer', 'buyer'].includes(userProfile.userRole));

        if (hasFirstName && hasLastName && hasRole) {
          return true;
        }

        // If we have partial data but Firebase user is missing, still consider it incomplete
        
      }
    }

    // Check Firebase user (as fallback or additional validation)
  const user = auth.currentUser;

    if (user) {
      // Check Firebase Auth profile
      const hasDisplayName = !!(user.displayName && user.displayName.trim());

      

      // If Firebase has display name, consider profile complete
      if (hasDisplayName) {
        return true;
      }
    }

    
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
  const user = auth.currentUser;
    if (!user) {
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
    

    // Check each step (all async now) - don't require Firebase user for initial checks
    const phoneVerified = await isPhoneVerified();
    const roleSelected = await isRoleSelected();
    const profileCompleted = await isProfileCompleted();
    const fruitsSelected = await hasBuyerSelectedFruits();
    const authComplete = await isAuthComplete();

    

    // If all steps are complete, go to main app
    if (phoneVerified && roleSelected && profileCompleted && authComplete) {
      
      
      // Check if we have a Firebase user
  const user = auth.currentUser;
      if (user) {
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
        }
        
      }
    }

    // Now check Firebase user for validation if we have partial auth state
  const user = auth.currentUser;

    // If we have partial progress but no Firebase user, validate if user still exists
  if ((phoneVerified || roleSelected || profileCompleted) && !user) {
      

      // Check if we have a valid user in AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const userProfile = JSON.parse(userData);
    if (userProfile.uid) {
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
    }
    // Step 2: Role selection (only if phone is verified)
    else if (phoneVerified && !roleSelected) {
      currentStep = 'role_selection';
    }
    // Step 3: Profile completion (only if phone verified AND role selected)
    else if (phoneVerified && roleSelected && !profileCompleted) {
      currentStep = 'profile_setup';
    }
    // Step 3b: Buyer fruits selection (only if profile is complete already)
    else if (phoneVerified && roleSelected) {
      // Check for buyer-specific fruits step when authStep is not complete
      const userData = await AsyncStorage.getItem('userData');
      const authStep = await AsyncStorage.getItem('authStep');
      const role = (() => { try { return userData ? JSON.parse(userData)?.userRole : null; } catch { return null; }})();
      if (role === 'buyer' && !authComplete && profileCompleted && !fruitsSelected) {
        currentStep = 'fruits_selection';
      }
    }
    // Step 4: If all main steps are complete, go to main app
    else if (phoneVerified && roleSelected && profileCompleted) {
      
  const fbUser = auth.currentUser;
      if (fbUser) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const userProfile = JSON.parse(userData);
          if (userProfile?.uid && userProfile.uid !== fbUser.uid) {
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
    
  } catch (error) {
    console.error('Error in debugAuthState:', error);
  }
};

/**
 * Clear all auth data (for logout)
 */
export const clearAuthData = async (): Promise<void> => {
  try {
     
    // Clear AsyncStorage keys - comprehensive list of all possible auth-related keys
    const keysToRemove = [
      
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
  
    
    // Remove duplicates and filter out undefined values
    const uniqueKeysToRemove = [...new Set(keysToRemove.filter(Boolean))];
    
    
    await AsyncStorage.multiRemove(uniqueKeysToRemove);
    
    // Clear user role using the dedicated function
    await clearUserRole();
    
    
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    throw error;
  }
};
