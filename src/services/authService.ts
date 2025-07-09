/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  LoginRequest, 
  RegisterRequest, 
  OTPVerificationRequest, 
  ApiResponse, 
  User 
} from '../types';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

class AuthService {
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔐 Starting login process...');
      
      // Call backend login
      const response = await httpClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        data
      );
      
      const authData = response.data.data!;
      console.log('✅ Backend login successful');
      
      // If login successful and we have user data, ensure Firebase Auth persistence
      if (authData.user && authData.user.email) {
        try {
          // Check if Firebase user exists, if not this might be a custom auth system
          const currentFirebaseUser = auth().currentUser;
          if (!currentFirebaseUser) {
            console.log('🔐 No Firebase user found, login might be using custom auth');
            // You might want to create a custom token or handle this differently
          } else {
            console.log('🔐 Firebase user already authenticated:', currentFirebaseUser.uid);
          }
        } catch (firebaseError) {
          console.warn('⚠️ Firebase auth check failed during login:', firebaseError);
        }
      }
      
      return authData;
    } catch (error) {
      console.error('❌ Login process failed:', error);
      throw error;
    }
  }

  async register(data: RegisterRequest): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  }

  async verifyOTP(data: OTPVerificationRequest): Promise<AuthResponse> {
    const response = await httpClient.post<ApiResponse<AuthResponse>>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      data
    );
    return response.data.data!;
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await httpClient.post<ApiResponse<AuthResponse>>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { token }
    );
    return response.data.data!;
  }

  async logout(): Promise<void> {
    try {
      console.log('🚪 Starting logout process...');
      
      // 1. Call backend logout endpoint
      try {
        await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
        console.log('✅ Backend logout successful');
      } catch (error) {
        console.warn('⚠️ Backend logout failed, continuing with local logout:', error);
      }
      
      // 2. Sign out from Firebase Auth
      try {
        await auth().signOut();
        console.log('✅ Firebase Auth logout successful');
      } catch (error) {
        console.warn('⚠️ Firebase Auth logout failed:', error);
      }
      
      // 3. Clear AsyncStorage auth data
      try {
        await AsyncStorage.multiRemove([
          'userData',
          'authStep',
          'userRole',
          'lastLoginTime',
          'authToken'
        ]);
        console.log('✅ AsyncStorage auth data cleared');
      } catch (error) {
        console.warn('⚠️ AsyncStorage cleanup failed:', error);
      }
      
      console.log('✅ Logout process completed');
    } catch (error) {
      console.error('❌ Logout process failed:', error);
      throw error;
    }
  }

  async forgotPassword(phone: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { phone }
    );
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, password }
    );
    return response.data;
  }

  async sendOTP(phone: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      '/auth/send-otp',
      { phone }
    );
    return response.data;
  }

  /**
   * Initialize Firebase Auth and check current auth state
   */
  async initializeAuth(): Promise<{ isAuthenticated: boolean; user: any | null }> {
    try {
      console.log('🔐 Initializing Firebase Auth...');
      
      return new Promise((resolve) => {
        const unsubscribe = auth().onAuthStateChanged((user) => {
          console.log('🔐 Firebase Auth initialized, user:', user ? user.uid : 'No user');
          unsubscribe(); // Clean up listener
          
          resolve({
            isAuthenticated: !!user,
            user: user ? {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
              displayName: user.displayName,
              phoneNumber: user.phoneNumber,
            } : null
          });
        });
      });
    } catch (error) {
      console.error('❌ Firebase Auth initialization failed:', error);
      return { isAuthenticated: false, user: null };
    }
  }
}

export const authService = new AuthService();
