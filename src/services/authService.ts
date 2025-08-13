/**
 * Enhanced Authentication Service
 * Handles all auth-related operations with improved security, type safety, and error handling
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient } from './httpClient';
import { API_ENDPOINTS, StorageKeys, SecureStorageKeys } from '../constants';
import { secureStorage } from '../utils/secureStorage';
import { authConfig } from '../config/authConfig';
import { 
  LoginRequest, 
  RegisterRequest, 
  OTPVerificationRequest, 
  ApiResponse, 
  User 
} from '../types';
import {
  AuthResponse,
  AuthInitializationResult,
  SecureTokens,
  AuthError,
  AuthServiceConfig,
  validateApiResponse,
  validateAuthResponse,
  validateUser,
  FirebaseAuthUser
} from '../types/auth';
import { persistentAuthManager } from '../utils/persistentAuthManager';

class AuthService {
  private config: AuthServiceConfig = { ...authConfig };

  /**
   * Login with enhanced security and validation
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      this.logSecure('🔐 Starting login process...');
      
      // Validate input data
      if (!data.phone?.trim()) {
        throw this.createAuthError('Phone number is required', 'validation');
      }

      // Call backend login
      const response = await this.makeAuthRequest<AuthResponse>(
        () => httpClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, data)
      );

      if (!response) {
        throw this.createAuthError('Invalid response from server', 'network');
      }

      // Validate response structure
      if (!validateAuthResponse(response)) {
        throw this.createAuthError('Invalid authentication data received', 'validation');
      }

      this.logSecure('✅ Backend login successful');

      // Handle Firebase authentication if enabled and custom token provided
      if (this.config.enableFirebaseAuth && response.customFirebaseToken) {
        try {
          await this.authenticateWithFirebase(response.customFirebaseToken);
          this.logSecure('✅ Firebase authentication successful');
        } catch (firebaseError) {
          // If Firebase auth fails, don't proceed with login
          throw this.createAuthError(
            'Firebase authentication failed', 
            'firebase',
            firebaseError
          );
        }
      }

      // Store tokens securely
      await this.storeAuthTokens({
        authToken: response.token,
        refreshToken: response.refreshToken,
        firebaseToken: response.customFirebaseToken,
        expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined,
      });

      // Store user data (non-sensitive) in AsyncStorage
      if (validateUser(response.user)) {
        await AsyncStorage.setItem(StorageKeys.USER_DATA, JSON.stringify(response.user));
        await AsyncStorage.setItem(StorageKeys.USER_ROLE, response.user.userType);
        
        // Enable persistent login after successful OTP verification
        if (response.user.id) {
          await persistentAuthManager.enablePersistentLogin(response.user.id);
        }
      }

      this.logSecure('✅ Login process completed successfully');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Login failed');
      this.logSecure('❌ Login process failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Register with validation
   */
  async register(data: RegisterRequest): Promise<ApiResponse> {
    try {
      this.logSecure('📝 Starting registration process...');

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'userType'];
      for (const field of requiredFields) {
        if (!data[field as keyof RegisterRequest]?.toString().trim()) {
          throw this.createAuthError(`${field} is required`, 'validation');
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw this.createAuthError('Invalid email format', 'validation');
      }

      // Validate user type
      if (!['farmer', 'buyer'].includes(data.userType)) {
        throw this.createAuthError('Invalid user type', 'validation');
      }

      const response = await this.makeAuthRequest<ApiResponse>(
        () => httpClient.post<ApiResponse>(API_ENDPOINTS.AUTH.REGISTER, data)
      );

      this.logSecure('✅ Registration process completed');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Registration failed');
      this.logSecure('❌ Registration process failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Send OTP with validation
   */
  async sendOTP(phone: string): Promise<ApiResponse> {
    try {
      this.logSecure('📱 Sending OTP...');

      if (!phone?.trim()) {
        throw this.createAuthError('Phone number is required', 'validation');
      }

      // Validate phone format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
        throw this.createAuthError('Invalid phone number format', 'validation');
      }

      const response = await this.makeAuthRequest<ApiResponse>(
        () => httpClient.post<ApiResponse>(API_ENDPOINTS.AUTH.SEND_OTP, { phone })
      );

      this.logSecure('✅ OTP sent successfully');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Failed to send OTP');
      this.logSecure('❌ OTP sending failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Verify OTP with validation
   */
  async verifyOTP(data: OTPVerificationRequest): Promise<AuthResponse> {
    try {
      this.logSecure('🔢 Verifying OTP...');

      if (!data.phone?.trim() || !data.otp?.trim()) {
        throw this.createAuthError('Phone and OTP are required', 'validation');
      }

      // Validate OTP format (assuming 4-6 digits)
      const otpRegex = /^\d{4,6}$/;
      if (!otpRegex.test(data.otp)) {
        throw this.createAuthError('Invalid OTP format', 'validation');
      }

      const response = await this.makeAuthRequest<AuthResponse>(
        () => httpClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.VERIFY_OTP, data)
      );

      if (!validateAuthResponse(response)) {
        throw this.createAuthError('Invalid verification response', 'validation');
      }

      // Store authentication data after successful verification
      await this.storeAuthTokens({
        authToken: response.token,
        refreshToken: response.refreshToken,
        firebaseToken: response.customFirebaseToken,
        expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined,
      });

      if (validateUser(response.user)) {
        await AsyncStorage.setItem(StorageKeys.USER_DATA, JSON.stringify(response.user));
        await AsyncStorage.setItem(StorageKeys.USER_ROLE, response.user.userType);
        
        // Enable persistent login after successful OTP verification
        if (response.user.id) {
          await persistentAuthManager.enablePersistentLogin(response.user.id);
        }
      }

      this.logSecure('✅ OTP verification completed successfully');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'OTP verification failed');
      this.logSecure('❌ OTP verification failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Refresh token with automatic retry
   */
  async refreshToken(token?: string): Promise<AuthResponse> {
    try {
      this.logSecure('🔄 Refreshing authentication token...');

      let refreshToken = token;
      if (!refreshToken) {
        const storedRefreshToken = await secureStorage.getItem(SecureStorageKeys.REFRESH_TOKEN);
        refreshToken = storedRefreshToken || undefined;
      }

      if (!refreshToken) {
        throw this.createAuthError('No refresh token available', 'auth');
      }

      const response = await this.makeAuthRequest<AuthResponse>(
        () => httpClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { token: refreshToken })
      );

      if (!validateAuthResponse(response)) {
        throw this.createAuthError('Invalid token refresh response', 'validation');
      }

      // Update stored tokens
      await this.storeAuthTokens({
        authToken: response.token,
        refreshToken: response.refreshToken,
        firebaseToken: response.customFirebaseToken,
        expiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined,
      });

      this.logSecure('✅ Token refreshed successfully');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Token refresh failed');
      this.logSecure('❌ Token refresh failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Enhanced logout with comprehensive cleanup
   */
  async logout(): Promise<void> {
    const errors: string[] = [];

    try {
      this.logSecure('🚪 Starting comprehensive logout process...');
      
      // Disable persistent login for manual logout
      await persistentAuthManager.disablePersistentLogin();
      
      // 1. Call backend logout (non-blocking)
      try {
        await this.makeAuthRequest(() => httpClient.post(API_ENDPOINTS.AUTH.LOGOUT));
        this.logSecure('✅ Backend logout successful');
      } catch (error) {
        const errorMsg = 'Backend logout failed';
        errors.push(errorMsg);
        this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
      }
      
      // 2. Sign out from Firebase Auth
      if (this.config.enableFirebaseAuth) {
        try {
          await auth().signOut();
          this.logSecure('✅ Firebase Auth logout successful');
        } catch (error) {
          const errorMsg = 'Firebase Auth logout failed';
          errors.push(errorMsg);
          this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
        }
      }
      
      // 3. Clear secure storage
      if (this.config.enableSecureStorage) {
        try {
          const secureKeys = Object.values(SecureStorageKeys);
          await secureStorage.removeMultipleItems(secureKeys);
          this.logSecure('✅ Secure storage cleared');
        } catch (error) {
          const errorMsg = 'Secure storage cleanup failed';
          errors.push(errorMsg);
          this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
        }
      }
      
      // 4. Clear AsyncStorage auth data
      try {
        const asyncStorageKeys = [
          StorageKeys.USER_DATA,
          StorageKeys.USER_ROLE,
          // Legacy keys for backward compatibility
          'userData',
          'authStep',
          'userRole',
          'user_role',
          'lastLoginTime',
          'authToken',
          'auth_state',
          'isAuthenticated',
          'bootstrapAuth',
          'phoneVerified',
          'roleSelected',
          'profileCompleted'
        ];
        
        await AsyncStorage.multiRemove(asyncStorageKeys);
        this.logSecure('✅ AsyncStorage auth data cleared');
      } catch (error) {
        const errorMsg = 'AsyncStorage cleanup failed';
        errors.push(errorMsg);
        this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
      }
      
      // 5. Import and use authFlow clearAuthData for additional cleanup
      try {
        const { clearAuthData } = await import('../utils/authFlow');
        await clearAuthData();
        this.logSecure('✅ AuthFlow cleanup completed');
      } catch (error) {
        const errorMsg = 'AuthFlow cleanup failed';
        errors.push(errorMsg);
        this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
      }
      
      // 6. Reset auth bootstrap state
      try {
        const { authBootstrap } = await import('../utils/authBootstrap');
        authBootstrap.reset();
        this.logSecure('✅ Bootstrap auth state reset');
      } catch (error) {
        const errorMsg = 'Bootstrap auth reset failed';
        errors.push(errorMsg);
        this.logSecure(`⚠️ ${errorMsg}:`, this.sanitizeError(error));
      }
      
      // Small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (errors.length > 0) {
        this.logSecure(`⚠️ Logout completed with ${errors.length} non-critical errors:`, errors);
      } else {
        this.logSecure('✅ Comprehensive logout process completed successfully');
      }
      
    } catch (error) {
      const authError = this.handleError(error, 'Logout process failed');
      this.logSecure('❌ Logout process failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Forgot password with validation
   */
  async forgotPassword(phone: string): Promise<ApiResponse> {
    try {
      this.logSecure('🔓 Starting forgot password process...');

      if (!phone?.trim()) {
        throw this.createAuthError('Phone number is required', 'validation');
      }

      const response = await this.makeAuthRequest<ApiResponse>(
        () => httpClient.post<ApiResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { phone })
      );

      this.logSecure('✅ Forgot password process completed');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Forgot password failed');
      this.logSecure('❌ Forgot password failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Reset password with validation
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    try {
      this.logSecure('🔒 Starting password reset...');

      if (!token?.trim() || !password?.trim()) {
        throw this.createAuthError('Token and password are required', 'validation');
      }

      // Validate password strength (basic)
      if (password.length < 8) {
        throw this.createAuthError('Password must be at least 8 characters long', 'validation');
      }

      const response = await this.makeAuthRequest<ApiResponse>(
        () => httpClient.post<ApiResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password })
      );

      this.logSecure('✅ Password reset completed');
      return response;

    } catch (error) {
      const authError = this.handleError(error, 'Password reset failed');
      this.logSecure('❌ Password reset failed:', authError.message);
      throw authError;
    }
  }

  /**
   * Initialize authentication with timeout and comprehensive validation
   */
  async initializeAuth(): Promise<AuthInitializationResult> {
    try {
      this.logSecure('🔐 Initializing authentication system...');

      // Check if we have stored tokens
      const storedTokens = await this.getStoredTokens();
      let backendTokenValid = false;
      let storedUser: User | null = null;

      // Validate stored backend token
      if (storedTokens?.authToken) {
        try {
          // Check if token is not expired
          if (!storedTokens.expiresAt || storedTokens.expiresAt > Date.now()) {
            // Try to get user data from storage
            const userData = await AsyncStorage.getItem(StorageKeys.USER_DATA);
            if (userData) {
              const parsedUser = JSON.parse(userData);
              if (validateUser(parsedUser)) {
                storedUser = parsedUser;
                backendTokenValid = true;
                this.logSecure('✅ Valid backend token found in storage');
              }
            }
          } else {
            this.logSecure('⚠️ Stored token has expired');
          }
        } catch (error) {
          this.logSecure('⚠️ Error validating stored token:', this.sanitizeError(error));
        }
      }

      // Initialize Firebase Auth with timeout
      const firebaseResult = await this.initializeFirebaseAuth();

      // Determine final authentication state
      let finalResult: AuthInitializationResult;

      if (firebaseResult.user && backendTokenValid && storedUser) {
        // Both Firebase and backend are authenticated
        finalResult = {
          isAuthenticated: true,
          user: storedUser,
          source: 'firebase',
        };
        this.logSecure('✅ Authentication initialized: Firebase + Backend');
      } else if (backendTokenValid && storedUser) {
        // Only backend is authenticated
        finalResult = {
          isAuthenticated: true,
          user: storedUser,
          source: 'backend',
        };
        this.logSecure('✅ Authentication initialized: Backend only');
      } else if (firebaseResult.user) {
        // Only Firebase is authenticated (might need to sync with backend)
        finalResult = {
          isAuthenticated: true,
          user: await this.createUserFromFirebase(firebaseResult.user),
          source: 'firebase',
        };
        this.logSecure('✅ Authentication initialized: Firebase only');
      } else {
        // No valid authentication found
        finalResult = {
          isAuthenticated: false,
          user: null,
          source: 'none',
        };
        this.logSecure('ℹ️ No valid authentication found');
      }

      return finalResult;

    } catch (error) {
      const authError = this.handleError(error, 'Authentication initialization failed');
      this.logSecure('❌ Authentication initialization failed:', authError.message);
      
      return {
        isAuthenticated: false,
        user: null,
        source: 'none',
        error: authError.message,
      };
    }
  }

  /**
   * Initialize Firebase Auth with timeout protection
   */
  private async initializeFirebaseAuth(): Promise<{ user: FirebaseAuthUser | null }> {
    return new Promise((resolve) => {
      let resolved = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.logSecure('⚠️ Firebase Auth initialization timeout');
          resolve({ user: null });
        }
      }, this.config.authTimeout);

      // Check current user immediately
      const currentUser = auth().currentUser;
      if (currentUser) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          this.logSecure('🔐 Firebase user immediately available:', currentUser.uid);
          resolve({ user: this.mapFirebaseUser(currentUser) });
        }
        return;
      }

      // Listen for auth state changes
      const unsubscribe = auth().onAuthStateChanged((user) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          unsubscribe();
          
          if (user) {
            this.logSecure('🔐 Firebase Auth state changed: User authenticated');
            resolve({ user: this.mapFirebaseUser(user) });
          } else {
            this.logSecure('🔐 Firebase Auth state changed: No user');
            resolve({ user: null });
          }
        }
      });

      // Fallback check after a brief delay
      setTimeout(() => {
        if (!resolved) {
          const currentUser = auth().currentUser;
          clearTimeout(timeout);
          unsubscribe();
          resolved = true;
          
          this.logSecure('🔐 Firebase Auth fallback check:', currentUser ? 'User found' : 'No user');
          resolve({ user: currentUser ? this.mapFirebaseUser(currentUser) : null });
        }
      }, 1000);
    });
  }

  /**
   * Private helper methods
   */

  /**
   * Make authenticated API request with retry logic
   */
  private async makeAuthRequest<T>(
    requestFn: () => Promise<{ data: ApiResponse<T> }>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await requestFn();
        
        if (!validateApiResponse(response.data)) {
          throw this.createAuthError('Invalid API response format', 'network');
        }

        if (!response.data.success) {
          throw this.createAuthError(
            response.data.message || response.data.error || 'API request failed',
            'network'
          );
        }

        if (!response.data.data) {
          throw this.createAuthError('No data in API response', 'network');
        }

        return response.data.data as T;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          this.logSecure(`⚠️ Request attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    throw lastError || this.createAuthError('Max retries exceeded', 'network');
  }

  /**
   * Store authentication tokens securely
   */
  private async storeAuthTokens(tokens: SecureTokens): Promise<void> {
    if (!this.config.enableSecureStorage) {
      return;
    }

    try {
      const tokenData: Record<string, string> = {};

      if (tokens.authToken) {
        tokenData[SecureStorageKeys.AUTH_TOKEN] = tokens.authToken;
      }

      if (tokens.refreshToken) {
        tokenData[SecureStorageKeys.REFRESH_TOKEN] = tokens.refreshToken;
      }

      if (tokens.firebaseToken) {
        tokenData[SecureStorageKeys.FIREBASE_TOKEN] = tokens.firebaseToken;
      }

      // Store token metadata
      if (tokens.expiresAt) {
        tokenData[`${SecureStorageKeys.AUTH_TOKEN}_expires`] = tokens.expiresAt.toString();
      }

      await secureStorage.setMultipleItems(tokenData);

    } catch (error) {
      throw this.createAuthError('Failed to store authentication tokens', 'storage', error);
    }
  }

  /**
   * Get stored authentication tokens
   */
  private async getStoredTokens(): Promise<SecureTokens | null> {
    if (!this.config.enableSecureStorage) {
      return null;
    }

    try {
      const authToken = await secureStorage.getItem(SecureStorageKeys.AUTH_TOKEN);
      const refreshToken = await secureStorage.getItem(SecureStorageKeys.REFRESH_TOKEN);
      const firebaseToken = await secureStorage.getItem(SecureStorageKeys.FIREBASE_TOKEN);
      const expiresAtStr = await secureStorage.getItem(`${SecureStorageKeys.AUTH_TOKEN}_expires`);

      if (!authToken) {
        return null;
      }

      return {
        authToken,
        refreshToken: refreshToken || undefined,
        firebaseToken: firebaseToken || undefined,
        expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : undefined,
      };

    } catch (error) {
      this.logSecure('⚠️ Error retrieving stored tokens:', this.sanitizeError(error));
      return null;
    }
  }

  /**
   * Authenticate with Firebase using custom token
   */
  private async authenticateWithFirebase(customToken: string): Promise<void> {
    try {
      await auth().signInWithCustomToken(customToken);
    } catch (error) {
      throw this.createAuthError('Firebase custom token authentication failed', 'firebase', error);
    }
  }

  /**
   * Map Firebase user to our FirebaseAuthUser interface
   */
  private mapFirebaseUser(firebaseUser: FirebaseAuthTypes.User): FirebaseAuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      displayName: firebaseUser.displayName,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
      providerId: firebaseUser.providerId,
    };
  }

  /**
   * Create a User object from Firebase user data
   */
  private async createUserFromFirebase(firebaseUser: FirebaseAuthUser): Promise<User> {
    // This is a fallback - you might want to sync with your backend here
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      phone: firebaseUser.phoneNumber || '',
      firstName: firebaseUser.displayName?.split(' ')[0] || 'Unknown',
      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'User',
      avatar: firebaseUser.photoURL || undefined,
      userType: 'buyer', // Default - should be determined from your backend
      status: 'active',
      isVerified: firebaseUser.emailVerified,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a standardized AuthError
   */
  private createAuthError(
    message: string, 
    type: AuthError['type'], 
    originalError?: unknown
  ): AuthError {
    const error = new Error(message) as AuthError;
    error.type = type;
    
    if (originalError && typeof originalError === 'object') {
      error.details = originalError as Record<string, unknown>;
      
      if ('code' in originalError && typeof originalError.code === 'string') {
        error.code = originalError.code;
      }
    }
    
    return error;
  }

  /**
   * Handle and standardize errors
   */
  private handleError(error: unknown, defaultMessage: string): AuthError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as AuthError;
    }

    if (error instanceof Error) {
      return this.createAuthError(
        error.message || defaultMessage,
        'unknown',
        error
      );
    }

    return this.createAuthError(defaultMessage, 'unknown', error);
  }

  /**
   * Sanitize error for logging (remove sensitive information)
   */
  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.replace(/password|token|credential|secret|key/gi, '[REDACTED]');
    }
    
    if (typeof error === 'string') {
      return error.replace(/password|token|credential|secret|key/gi, '[REDACTED]');
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Secure logging that respects production environment
   */
  private logSecure(message: string, ...args: unknown[]): void {
    if (this.config.logSensitiveData) {
      console.log(message, ...args);
    } else {
      // In production, log only non-sensitive information
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return this.sanitizeError(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
          return '[OBJECT]';
        }
        return arg;
      });
      console.log(message, ...sanitizedArgs);
    }
  }

  /**
   * Public utility methods
   */

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      const firebaseUser = auth().currentUser;
      
      return !!(tokens?.authToken || firebaseUser);
    } catch (error) {
      this.logSecure('⚠️ Error checking authentication status:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(StorageKeys.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        return validateUser(user) ? user : null;
      }
      return null;
    } catch (error) {
      this.logSecure('⚠️ Error getting current user:', this.sanitizeError(error));
      return null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AuthServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<AuthServiceConfig> {
    return { ...this.config };
  }
}

export const authService = new AuthService();
