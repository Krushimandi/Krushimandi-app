/**
 * Secure Storage Utility
 * Handles secure storage of sensitive data using react-native-keychain
 * Enhanced with token management and authentication support
 */

import * as Keychain from 'react-native-keychain';
import { SecureStorageKeys } from '../constants/AppConstants';

interface SecureStorageOptions {
  service?: string;
  accessGroup?: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  storedAt: number;
}

class SecureStorageService {
  private defaultService = 'KrushiMandi';

  /**
   * Store a value securely
   */
  async setItem(key: string, value: string, options?: SecureStorageOptions): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(key, value, { service: key });
      return true;
    } catch (error) {
      console.error(`SecureStorage: Failed to store ${key}:`, this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Retrieve a value securely
   */
  async getItem(key: string, options?: SecureStorageOptions): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key });
      
      if (credentials && typeof credentials === 'object' && 'password' in credentials) {
        return credentials.password;
      }
      
      return null;
    } catch (error) {
      console.error(`SecureStorage: Failed to retrieve ${key}:`, this.sanitizeError(error));
      return null;
    }
  }

  /**
   * Remove a value securely
   */
  async removeItem(key: string, options?: SecureStorageOptions): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: key });
      return true;
    } catch (error) {
      // Keychain might throw if key doesn't exist, which is fine
      console.warn(`SecureStorage: Could not remove ${key}:`, this.sanitizeError(error));
      return true; // Consider it successful if key doesn't exist
    }
  }

  /**
   * Store multiple items securely
   */
  async setMultipleItems(items: Record<string, string>, options?: SecureStorageOptions): Promise<boolean> {
    try {
      const promises = Object.entries(items).map(([key, value]) =>
        this.setItem(key, value, options)
      );
      
      const results = await Promise.allSettled(promises);
      return results.every(result => result.status === 'fulfilled' && result.value === true);
    } catch (error) {
      console.error('SecureStorage: Failed to store multiple items:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Remove multiple items securely
   */
  async removeMultipleItems(keys: string[], options?: SecureStorageOptions): Promise<boolean> {
    try {
      const promises = keys.map(key => this.removeItem(key, options));
      
      const results = await Promise.allSettled(promises);
      return results.every(result => result.status === 'fulfilled' && result.value === true);
    } catch (error) {
      console.error('SecureStorage: Failed to remove multiple items:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Check if keychain is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await Keychain.getSupportedBiometryType();
      return true; // If we get here without error, keychain is available
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all secure storage (use with caution)
   */
  async clearAll(): Promise<boolean> {
    try {
      const allKeys = Object.values(SecureStorageKeys);
      return await this.removeMultipleItems(allKeys);
    } catch (error) {
      console.error('SecureStorage: Failed to clear all items:', this.sanitizeError(error));
      return false;
    }
  }

  // ====================================
  // TOKEN MANAGEMENT METHODS
  // ====================================

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokenData: Omit<TokenData, 'storedAt'>): Promise<boolean> {
    try {
      const tokenString = JSON.stringify({
        ...tokenData,
        storedAt: Date.now(),
      });

      const success = await this.setItem(SecureStorageKeys.AUTH_TOKEN, tokenString);
      
      if (__DEV__) {
        console.log('✅ Auth tokens stored securely');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to store auth tokens:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Retrieve authentication tokens
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      const tokenString = await this.getItem(SecureStorageKeys.AUTH_TOKEN);
      
      if (!tokenString) {
        return null;
      }

      const tokenData = JSON.parse(tokenString) as TokenData;
      
      // Check if access token is expired
      if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
        if (__DEV__) {
          console.log('🕐 Access token expired');
        }
        return {
          ...tokenData,
          accessToken: '', // Clear expired token
        };
      }

      return tokenData;
    } catch (error) {
      console.error('❌ Failed to retrieve tokens:', this.sanitizeError(error));
      return null;
    }
  }

  /**
   * Get only access token (commonly used)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get only refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Check if access token is valid and not expired
   */
  async isTokenValid(): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens?.accessToken) return false;
    
    if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
      return false;
    }
    
    return true;
  }

  /**
   * Update only access token (useful after refresh)
   */
  async updateAccessToken(accessToken: string, expiresAt: number): Promise<boolean> {
    try {
      const existingTokens = await this.getTokens();
      if (!existingTokens) {
        console.error('No existing tokens to update');
        return false;
      }

      return await this.storeTokens({
        ...existingTokens,
        accessToken,
        expiresAt,
      });
    } catch (error) {
      console.error('❌ Failed to update access token:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Clear all authentication tokens
   */
  async clearTokens(): Promise<boolean> {
    try {
      const success = await this.removeItem(SecureStorageKeys.AUTH_TOKEN);
      if (__DEV__) {
        console.log('✅ Auth tokens cleared');
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to clear tokens:', this.sanitizeError(error));
      return false;
    }
  }

  /**
   * Store Firebase token securely
   */
  async storeFirebaseToken(token: string): Promise<boolean> {
    return await this.setItem(SecureStorageKeys.FIREBASE_TOKEN, token);
  }

  /**
   * Get Firebase token
   */
  async getFirebaseToken(): Promise<string | null> {
    return await this.getItem(SecureStorageKeys.FIREBASE_TOKEN);
  }

  /**
   * Clear Firebase token
   */
  async clearFirebaseToken(): Promise<boolean> {
    return await this.removeItem(SecureStorageKeys.FIREBASE_TOKEN);
  }

  /**
   * Sanitize error messages to avoid leaking sensitive information
   */
  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // Remove sensitive information from error messages
      return error.message.replace(/password|token|credential|secret/gi, '[REDACTED]');
    }
    return 'Unknown error occurred';
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();

// Export types
export type { SecureStorageOptions, TokenData };
