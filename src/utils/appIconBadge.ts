/**
 * App Icon Badge Utility
 * Handles setting and clearing app icon badges with Notifee integration
 */

import { Platform } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import notifee from '@notifee/react-native';
import { getUnreadNotificationCount, getBadgeCount } from '../services/notificationService';

/**
 * Set app icon badge count
 * @param count - badge count (optional, will get from notification service if not provided)
 */
export const setAppIconBadge = async (count?: number): Promise<void> => {
    const badgeCount = count !== undefined ? count : getUnreadNotificationCount();
    
    try {
        if (Platform.OS === 'ios') {
            // For iOS, use both PushNotificationIOS and Notifee for better compatibility
            PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
            await notifee.setBadgeCount(badgeCount);
        } else if (Platform.OS === 'android') {
            // For Android, use Notifee (works with supported launchers)
            await notifee.setBadgeCount(badgeCount);
        }
        
    } catch (error) {
        console.error('❌ Error setting app icon badge:', error);
    }
};

/**
 * Clear app icon badge
 */
export const clearAppIconBadge = async (): Promise<void> => {
    await setAppIconBadge(0);
};

/**
 * Update app icon badge with current unread count
 */
export const updateAppIconBadge = async (): Promise<void> => {
    const count = getUnreadNotificationCount();
    await setAppIconBadge(count);
};

/**
 * Get badge text for UI display (shows "50+" if > 50)
 */
export const getBadgeText = (): string => {
    return getBadgeCount();
};

/**
 * Check if badge should be shown
 */
export const shouldShowBadge = (): boolean => {
    return getUnreadNotificationCount() > 0;
};
