/**
 * Notification Preferences Service
 * Manages user notification preferences stored in AsyncStorage and Firestore
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { auth } from '../config/firebaseModular';

const PREFERENCES_KEY = '@notification_preferences';

export interface NotificationPreferences {
    pushNotifications: boolean;
    emailNotifications: boolean;
    transactionAlerts: boolean;
    promotions: boolean;
    updates: boolean;
    soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    pushNotifications: true,
    emailNotifications: false,
    transactionAlerts: true,
    promotions: true,
    updates: true,
    soundEnabled: true,
};

/**
 * Load notification preferences from AsyncStorage and Firestore
 */
export const loadNotificationPreferences = async (): Promise<NotificationPreferences> => {
    try {
        // First try to load from AsyncStorage (faster)
        const localData = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (localData) {
            const parsed = JSON.parse(localData);
            return { ...DEFAULT_PREFERENCES, ...parsed };
        }

        // If not in AsyncStorage, try Firestore
        const currentUser = auth.currentUser;
        if (currentUser) {
            const doc = await firestore()
                .collection('profiles')
                .doc(currentUser.uid)
                .get();

            if (doc.exists()) {
                const data = doc.data();
                const preferences = data?.notificationPreferences;
                if (preferences) {
                    // Save to AsyncStorage for faster future access
                    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
                    return { ...DEFAULT_PREFERENCES, ...preferences };
                }
            }
        }

        // Return defaults if nothing found
        return DEFAULT_PREFERENCES;
    } catch (error) {
        console.error('❌ Error loading notification preferences:', error);
        return DEFAULT_PREFERENCES;
    }
};

/**
 * Save notification preferences to both AsyncStorage and Firestore
 */
export const saveNotificationPreferences = async (preferences: NotificationPreferences): Promise<void> => {
    try {
        // Save to AsyncStorage
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));

        // Save to Firestore
        const currentUser = auth.currentUser;
        if (currentUser) {
            await firestore()
                .collection('profiles')
                .doc(currentUser.uid)
                .set(
                    { notificationPreferences: preferences },
                    { merge: true }
                );
        }
    } catch (error) {
        console.error('❌ Error saving notification preferences:', error);
        throw error;
    }
};

/**
 * Update a single preference
 */
export const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
): Promise<void> => {
    try {
        const currentPreferences = await loadNotificationPreferences();
        const updatedPreferences = {
            ...currentPreferences,
            [key]: value,
        };
        await saveNotificationPreferences(updatedPreferences);
    } catch (error) {
        console.error(`❌ Error updating preference ${key}:`, error);
        throw error;
    }
};

/**
 * Reset preferences to defaults
 */
export const resetPreferencesToDefaults = async (): Promise<void> => {
    try {
        await saveNotificationPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
        console.error('❌ Error resetting preferences:', error);
        throw error;
    }
};

/**
 * Check if a specific notification type is enabled
 */
export const isNotificationTypeEnabled = async (type: keyof NotificationPreferences): Promise<boolean> => {
    try {
        const preferences = await loadNotificationPreferences();
        return preferences[type] ?? true; // Default to true if not set
    } catch (error) {
        console.error(`❌ Error checking if ${type} is enabled:`, error);
        return true; // Default to enabled on error
    }
};
