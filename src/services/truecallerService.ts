/**
 * Truecaller Authentication Service
 * Handles Truecaller SDK integration for quick phone verification
 */

import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/functions';
import { authFlowManager } from './authFlowManager';
import { secrets } from '../config/secrets';

// Truecaller OAuth credentials interface (for secure server-side verification)
export interface TruecallerOAuthCredentials {
  // OAuth 2.0 PKCE credentials from Truecaller SDK (Android)
  authorizationCode: string;
  codeVerifier: string;
}

// Legacy interface for compatibility (kept for reference)
export interface TruecallerUser {
  firstName: string;
  lastName: string | null;
  mobileNumber: string; // Format: +91XXXXXXXXXX
  phoneNumber?: string; // Format without + prefix
  countryCode: string;
  gender: string | null;
  email: string | null;
  profileUrl: string | null;
  // OAuth 2.0 PKCE credentials from Truecaller SDK (Android)
  authorizationCode?: string;
  codeVerifier?: string;
}

// Response from Firebase Cloud Function
export interface TruecallerAuthResponse {
  success: boolean;
  firebaseCustomToken?: string;
  uid?: string;
  isNewUser?: boolean;
  phoneNumber?: string;
  truecallerProfile?: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
  error?: string;
  errorCode?: string;
}

// Error codes from Truecaller SDK
export const TRUECALLER_ERROR_CODES = {
  NETWORK: 1, // Network Failure
  USER_REJECTED: 2, // User rejected/cancelled
  TRUECALLER_NOT_INSTALLED: 3, // Truecaller not installed
  INTERNAL_ERROR: 4, // Internal SDK error
  USER_PRESSED_ANOTHER_NUMBER: 5, // User clicked "Use another number"
  UNDEFINED: -1, // Undefined error
};

/**
 * Check if error indicates user wants to use another number (fallback to OTP)
 */
export const shouldFallbackToOTP = (errorCode: number | null): boolean => {
  if (!errorCode) return true;
  
  return [
    TRUECALLER_ERROR_CODES.USER_REJECTED,
    TRUECALLER_ERROR_CODES.TRUECALLER_NOT_INSTALLED,
    TRUECALLER_ERROR_CODES.USER_PRESSED_ANOTHER_NUMBER,
  ].includes(errorCode);
};

/**
 * Get Firebase Functions instance for the correct region
 */
const getVerifyTruecallerFunction = () => {
  // Must specify the region where the function is deployed
  return firebase.app().functions('asia-south1').httpsCallable('verifyTruecallerLogin');
};

/**
 * Verify Truecaller login via Firebase Cloud Function and sign in with custom token
 * This creates a Firebase session without requiring OTP verification
 * 
 * SECURE FLOW: Only OAuth credentials are sent to server.
 * The phone number comes from Truecaller's API (server-side), NOT from the frontend.
 * 
 * @param credentials - OAuth PKCE credentials from Truecaller SDK
 * @returns Promise with navigation route and auth status
 */
export const verifyTruecallerAndSignIn = async (
  credentials: TruecallerOAuthCredentials
): Promise<{ 
  success: boolean; 
  route: string; 
  params?: any; 
  error?: string;
  isNewUser?: boolean;
  phoneNumber?: string;
  truecallerProfile?: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}> => {
  try {
    // Validate OAuth credentials
    if (!credentials.authorizationCode || !credentials.codeVerifier) {
      throw new Error('Missing OAuth credentials from Truecaller');
    }

    console.log('🔐 Truecaller - Sending OAuth credentials to Cloud Function...');

    // Call Firebase Cloud Function - ONLY send OAuth credentials
    // The phone number will be retrieved server-side from Truecaller's API
    const verifyFunction = getVerifyTruecallerFunction();
    const result = await verifyFunction({
      authorizationCode: credentials.authorizationCode,
      codeVerifier: credentials.codeVerifier,
    });

    const response = result.data as TruecallerAuthResponse;

    if (!response.success || !response.firebaseCustomToken) {
      console.error('❌ Truecaller verification failed:', response.error);
      throw new Error(response.error || 'Verification failed');
    }

    console.log('✅ Truecaller - Cloud Function verification successful');
    console.log('📱 Phone number from server:', response.phoneNumber);
    console.log('🔐 Signing in with custom token...');

    // Sign in with custom token
    await auth().signInWithCustomToken(response.firebaseCustomToken);

    console.log('✅ Firebase sign-in successful. UID:', response.uid);

    // Determine navigation route based on user status
    if (response.isNewUser) {
      // New user - go to role selection for onboarding
      console.log('🆕 New user - navigating to RoleSelection');
      console.log('📱 Truecaller profile:', response.truecallerProfile);
      return { 
        success: true, 
        route: 'RoleSelection',
        isNewUser: true,
        phoneNumber: response.phoneNumber,
        truecallerProfile: response.truecallerProfile,
      };
    } else {
      // Existing user - check profile status and navigate accordingly
      console.log('👤 Existing user - checking profile status...');
      const route = await authFlowManager.resumeAuthFlow();
      return { 
        success: true, 
        route: route.screen, 
        params: route.params,
        isNewUser: false,
        phoneNumber: response.phoneNumber,
      };
    }
  } catch (error: any) {
    console.error('❌ Truecaller auth error:', error);
    
    // Check for specific error codes
    const errorCode = error?.details?.errorCode || error?.code;
    
    // Map error codes to user-friendly messages
    let errorMessage = 'Authentication failed';
    if (errorCode === 'TOKEN_EXCHANGE_FAILED') {
      errorMessage = 'Could not verify Truecaller credentials';
    } else if (errorCode === 'PROFILE_FETCH_FAILED') {
      errorMessage = 'Could not get profile from Truecaller';
    } else if (errorCode === 'PHONE_NUMBER_EXISTS') {
      errorMessage = 'Phone number already registered';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { 
      success: false, 
      route: 'MobileScreen',
      error: errorMessage,
    };
  }
};

/**
 * Handle successful Truecaller authentication (Legacy - OTP flow)
 * @deprecated Use verifyTruecallerAndSignIn instead for direct Firebase auth
 */
export const handleTruecallerSuccess = async (
  user: TruecallerUser,
  setPhoneNumber: (phone: string) => void,
  setConfirmation: (confirmation: any) => void
): Promise<{ success: boolean; route: string; params?: any; error?: string }> => {
  try {
    const phoneNumber = user.mobileNumber;
    
    if (!phoneNumber) {
      throw new Error('No phone number received from Truecaller');
    }

    console.log('📱 Truecaller - Phone verified:', phoneNumber);
    
    // Store phone number in auth context
    setPhoneNumber(phoneNumber);
    
    // Check if user already exists in Firebase with this phone
    const currentUser = auth().currentUser;
    
    if (currentUser?.phoneNumber === phoneNumber) {
      // User already authenticated with this phone - check profile status
      console.log('✅ Truecaller - User already authenticated, checking profile...');
      const route = await authFlowManager.resumeAuthFlow();
      return { success: true, route: route.screen, params: route.params };
    }

    // Send OTP via Firebase for verification
    console.log('📱 Truecaller - Sending OTP for Firebase verification...');
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    
    // Store confirmation in context
    setConfirmation(confirmation);
    
    // Navigate to OTP verification with auto-fill hint
    return { 
      success: true, 
      route: 'OTPVerification', 
      params: { 
        phoneNumber,
        fromTruecaller: true, // Flag to indicate auto-submitted from Truecaller
      } 
    };
  } catch (error: any) {
    console.error('❌ Truecaller auth error:', error);
    return { 
      success: false, 
      route: 'MobileScreen',
      error: error.message || 'Authentication failed'
    };
  }
};

/**
 * Truecaller configuration for the app
 */
export const TRUECALLER_CONFIG = {
  androidClientId: secrets.TRUECALLER_CLIENT_ID,
  
  // iOS configuration (if needed)
  iosAppKey: 'YOUR_IOS_APP_KEY',
  iosAppLink: 'YOUR_IOS_APP_LINK',
  
  // UI Customization
  buttonColor: '#7ED321', // Match app theme
  buttonTextColor: '#000000',
};

/**
 * Check if Truecaller is available on the device
 */
export const isTruecallerAvailable = (): boolean => {
  // Only available on Android for now
  return Platform.OS === 'android';
};
