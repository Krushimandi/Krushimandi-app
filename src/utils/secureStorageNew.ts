/**
 * Secure Storage Utility
 * Handles secure storage of sensitive data using react-native-keychain
 */

import * as Keychain from 'react-native-keychain';
import { SecureStorageKeys } from '../constants/AppConstants';

interface SecureStorageOptions {
  service?: string;
  accessGroup?: string;
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
export type { SecureStorageOptions };
