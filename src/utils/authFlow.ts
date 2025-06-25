import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateCurrentUser } from '../services/firebaseService';

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

      // Check if profile is marked as complete in local storage
      if (userProfile.isProfileComplete === true) {
        console.log('✅ Profile marked as complete in AsyncStorage');
        return true;
      }

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
    const authComplete = await isAuthComplete();

    // If all steps are complete, go to main app
    if (phoneVerified && roleSelected && profileCompleted && authComplete) {
      console.log('✅ All auth steps complete, going to Main');
      return {
        isAuthenticated: true,
        phoneVerified: true,
        roleSelected: true,
        profileCompleted: true,
        currentStep: 'complete',
        nextRoute: 'Main'
      };
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
    // Step 4: If everything seems complete but authComplete is false, go to profile
    else {
      currentStep = 'welcome';
      console.log('🔄 All steps seem complete but authComplete is false, going to welcome');
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
    await AsyncStorage.multiRemove([
      'userData',
      'user_role',
      'auth_state',
      'authStep'
    ]);
    console.log('✅ Auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
