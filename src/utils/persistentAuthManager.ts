/**
 * Persistent Authentication Manager
 * 
 * Ensures users remain logged in after successful OTP verification
 * unless they manually logout or are blocked from Firebase Console
 * 
 * Features:
 * - Prevents auto-logout due to network issues
 * - Maintains session persistence after OTP verification
 * - Only allows logout for manual action or account blocking
 * - Graceful error handling without forced logout
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { secureStorage } from './secureStorage';
import { StorageKeys, SecureStorageKeys } from '../constants';

interface PersistentAuthState {
  isPersistentLoginEnabled: boolean;
  otpVerifiedAt: string | null;
  userId: string | null;
  lastValidationAt: string | null;
  consecutiveFailures: number;
}

class PersistentAuthManager {
  private static instance: PersistentAuthManager;
  private authState: PersistentAuthState = {
    isPersistentLoginEnabled: false,
    otpVerifiedAt: null,
    userId: null,
    lastValidationAt: null,
    consecutiveFailures: 0
  };

  private readonly STORAGE_KEY = 'persistentAuthState';
  private readonly MAX_CONSECUTIVE_FAILURES = 5;
  private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): PersistentAuthManager {
    if (!PersistentAuthManager.instance) {
      PersistentAuthManager.instance = new PersistentAuthManager();
    }
    return PersistentAuthManager.instance;
  }

  /**
   * Initialize persistent auth manager
   */
  async initialize(): Promise<void> {
    try {
      const storedState = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedState) {
        this.authState = { ...this.authState, ...JSON.parse(storedState) };
        this.logSecure('🔄 Persistent auth state loaded');
      }
    } catch (error) {
      this.logSecure('⚠️ Failed to load persistent auth state:', error);
    }
  }

  /**
   * Enable persistent login after successful OTP verification
   */
  async enablePersistentLogin(userId: string): Promise<void> {
    try {
      this.authState = {
        isPersistentLoginEnabled: true,
        otpVerifiedAt: new Date().toISOString(),
        userId,
        lastValidationAt: new Date().toISOString(),
        consecutiveFailures: 0
      };

      await this.saveAuthState();
      this.logSecure('✅ Persistent login enabled for user:', userId);
    } catch (error) {
      this.logSecure('❌ Failed to enable persistent login:', error);
    }
  }

  /**
   * Disable persistent login (for manual logout)
   */
  async disablePersistentLogin(): Promise<void> {
    try {
      this.authState = {
        isPersistentLoginEnabled: false,
        otpVerifiedAt: null,
        userId: null,
        lastValidationAt: null,
        consecutiveFailures: 0
      };

      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.logSecure('🚪 Persistent login disabled');
    } catch (error) {
      this.logSecure('❌ Failed to disable persistent login:', error);
    }
  }

  /**
   * Check if persistent login is enabled
   */
  isPersistentLoginEnabled(): boolean {
    return this.authState.isPersistentLoginEnabled && !!this.authState.userId;
  }

  /**
   * Get current user ID from persistent auth
   */
  getPersistentUserId(): string | null {
    return this.authState.userId;
  }

  /**
   * Handle authentication errors with persistent login logic
   */
  async handleAuthError(error: any, context: string): Promise<{ shouldLogout: boolean; reason?: string }> {
    if (!this.isPersistentLoginEnabled()) {
      return { shouldLogout: true, reason: 'persistent_login_disabled' };
    }

    // Check if this is a manual logout request
    if (context === 'manual_logout') {
      return { shouldLogout: true, reason: 'manual_logout' };
    }

    // Check if user is disabled/blocked from Firebase Console
    if (this.isUserBlockedError(error)) {
      await this.disablePersistentLogin();
      return { shouldLogout: true, reason: 'user_blocked' };
    }

    // Check for account deletion from Firebase Console
    if (this.isUserDeletedError(error)) {
      await this.disablePersistentLogin();
      return { shouldLogout: true, reason: 'user_deleted' };
    }

    // Handle network errors - DON'T logout
    if (this.isNetworkError(error)) {
      this.logSecure('📶 Network error detected, maintaining session:', context);
      return { shouldLogout: false, reason: 'network_error' };
    }

    // Handle token refresh failures - DON'T logout if persistent login enabled
    if (this.isTokenError(error)) {
      this.authState.consecutiveFailures++;
      await this.saveAuthState();

      // Only logout after many consecutive failures (possible account issues)
      if (this.authState.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.logSecure('❌ Too many consecutive auth failures, disabling persistent login');
        await this.disablePersistentLogin();
        return { shouldLogout: true, reason: 'excessive_failures' };
      }

      this.logSecure(`⚠️ Token error (${this.authState.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}), maintaining session:`, context);
      return { shouldLogout: false, reason: 'token_error' };
    }

    // Handle server errors - DON'T logout
    if (this.isServerError(error)) {
      this.logSecure('🔧 Server error detected, maintaining session:', context);
      return { shouldLogout: false, reason: 'server_error' };
    }

    // For unknown errors, be conservative but don't logout immediately
    this.authState.consecutiveFailures++;
    await this.saveAuthState();

    if (this.authState.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      await this.disablePersistentLogin();
      return { shouldLogout: true, reason: 'unknown_repeated_errors' };
    }

    this.logSecure('⚠️ Unknown error, maintaining session for now:', context, error?.message);
    return { shouldLogout: false, reason: 'unknown_error' };
  }

  /**
   * Reset consecutive failures on successful operation
   */
  async resetFailureCount(): Promise<void> {
    if (this.authState.consecutiveFailures > 0) {
      this.authState.consecutiveFailures = 0;
      this.authState.lastValidationAt = new Date().toISOString();
      await this.saveAuthState();
      this.logSecure('✅ Auth failure count reset');
    }
  }

  /**
   * Validate persistent login periodically
   */
  async validatePersistentLogin(): Promise<boolean> {
    if (!this.isPersistentLoginEnabled()) {
      return false;
    }

    const now = Date.now();
    const lastValidation = this.authState.lastValidationAt ? new Date(this.authState.lastValidationAt).getTime() : 0;

    // Skip validation if done recently
    if (now - lastValidation < this.VALIDATION_INTERVAL) {
      return true;
    }

    try {
      // Check if Firebase user still exists
      const currentUser = auth().currentUser;
      if (!currentUser || currentUser.uid !== this.authState.userId) {
        this.logSecure('⚠️ Firebase user mismatch during validation');
        await this.disablePersistentLogin();
        return false;
      }

      // Try to reload user to check if account still exists
      await currentUser.reload();

      // Check if user is disabled
      if (currentUser.disabled) {
        this.logSecure('🚫 User account is disabled');
        await this.disablePersistentLogin();
        return false;
      }

      // Update validation timestamp
      this.authState.lastValidationAt = new Date().toISOString();
      await this.saveAuthState();
      await this.resetFailureCount();

      this.logSecure('✅ Persistent login validation successful');
      return true;

    } catch (error) {
      const errorResult = await this.handleAuthError(error, 'validation');
      if (errorResult.shouldLogout) {
        return false;
      }

      // Even if validation fails due to network, allow persistent login to continue
      this.logSecure('⚠️ Validation failed but maintaining session:', error?.message);
      return true;
    }
  }

  /**
   * Get persistent auth status summary
   */
  getAuthStatus(): PersistentAuthState {
    return { ...this.authState };
  }

  /**
   * Private helper methods
   */
  private async saveAuthState(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.authState));
    } catch (error) {
      this.logSecure('❌ Failed to save persistent auth state:', error);
    }
  }

  private isUserBlockedError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return (
      errorCode === 'auth/user-disabled' ||
      errorCode === 'auth/account-exists-with-different-credential' ||
      errorMessage.includes('disabled') ||
      errorMessage.includes('blocked') ||
      errorMessage.includes('suspended')
    );
  }

  private isUserDeletedError(error: any): boolean {
    if (!error) return false;
    
    const errorCode = error.code?.toLowerCase() || '';
    
    return (
      errorCode === 'auth/user-not-found' ||
      errorCode === 'auth/invalid-user-token' ||
      errorCode === 'auth/user-token-expired'
    );
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorCode === 'network-request-failed' ||
      errorCode === 'auth/network-request-failed' ||
      error.cancelled === true ||
      error.name === 'NetworkError' ||
      error.name === 'AbortError'
    );
  }

  private isTokenError(error: any): boolean {
    if (!error) return false;
    
    const errorCode = error.code?.toLowerCase() || '';
    const statusCode = error.response?.status || error.status;
    
    return (
      statusCode === 401 ||
      errorCode === 'auth/invalid-custom-token' ||
      errorCode === 'auth/custom-token-mismatch' ||
      errorCode === 'auth/id-token-expired' ||
      errorCode === 'auth/id-token-revoked'
    );
  }

  private isServerError(error: any): boolean {
    if (!error) return false;
    
    const statusCode = error.response?.status || error.status;
    
    return statusCode && statusCode >= 500 && statusCode < 600;
  }

  private logSecure(message: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.log(`[PersistentAuth] ${message}`, ...args);
    }
  }
}

export const persistentAuthManager = PersistentAuthManager.getInstance();
