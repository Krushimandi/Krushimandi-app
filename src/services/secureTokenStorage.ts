/**
 * Secure Token Storage Service
 * Uses react-native-keychain to store sensitive auth data in the OS keychain
 * instead of unencrypted AsyncStorage.
 */

import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.krushimandi.app';

/**
 * Store sensitive auth data securely in the device keychain.
 * @param key - Identifier for the stored data
 * @param value - The sensitive string to store (e.g., JSON-serialized tokens)
 */
export const setSecureItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await Keychain.setGenericPassword(key, value, { service: `${SERVICE_NAME}.${key}` });
    return true;
  } catch (error) {
    console.warn('[SecureStorage] Failed to store item:', key, error);
    return false;
  }
};

/**
 * Retrieve sensitive auth data from the device keychain.
 * @param key - Identifier for the stored data
 * @returns The stored string value, or null if not found
 */
export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    const result = await Keychain.getGenericPassword({ service: `${SERVICE_NAME}.${key}` });
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch (error) {
    console.warn('[SecureStorage] Failed to retrieve item:', key, error);
    return null;
  }
};

/**
 * Remove a specific item from the device keychain.
 * @param key - Identifier for the stored data
 */
export const removeSecureItem = async (key: string): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({ service: `${SERVICE_NAME}.${key}` });
    return true;
  } catch (error) {
    console.warn('[SecureStorage] Failed to remove item:', key, error);
    return false;
  }
};

/**
 * Clear all secure storage items used by the app.
 * Call this on logout to ensure no sensitive data remains.
 */
export const clearAllSecureItems = async (): Promise<void> => {
  const keys = ['userData', 'authTokens', 'refreshToken'];
  await Promise.all(keys.map((key) => removeSecureItem(key)));
};
