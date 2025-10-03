/**
 * Push Notification Hook
 * React hook for managing push notifications with Notifee and Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { pushNotificationService, PushNotificationData } from '../services/pushNotificationService';
import { useNotifications } from './useNotifications';

interface UsePushNotificationsReturn {
    isInitialized: boolean;
    fcmToken: string | null;
    permissionStatus: 'unknown' | 'granted' | 'denied' | 'provisional';
    sendTestNotification: (data?: Partial<PushNotificationData>) => Promise<void>;
    requestPermission: () => Promise<boolean>;
    cancelAllNotifications: () => Promise<void>;
    getDisplayedNotifications: () => Promise<any[]>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'provisional'>('unknown');
    const { refreshNotifications } = useNotifications();

    // Initialize push notifications on mount
    useEffect(() => {
        initializePushNotifications();
    }, []);

    // Handle app state changes
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // Refresh notifications when app becomes active
                refreshNotifications();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [refreshNotifications]);

    const initializePushNotifications = async () => {
        try {
            
            
            // Initialize the push notification service
            await pushNotificationService.initialize();
            
            // Get FCM token
            const token = pushNotificationService.getFCMTokenSync();
            setFcmToken(token);
            
            // Check permission status
            await checkPermissionStatus();
            
            setIsInitialized(true);
            
        } catch (error) {
            console.error('❌ Failed to initialize push notifications:', error);
            setIsInitialized(false);
        }
    };

    const checkPermissionStatus = async () => {
        try {
            const notifee = require('@notifee/react-native').default;
            const settings = await notifee.getNotificationSettings();
            
            switch (settings.authorizationStatus) {
                case 1:
                    setPermissionStatus('granted');
                    break;
                case 2:
                    setPermissionStatus('denied');
                    break;
                case 3:
                    setPermissionStatus('provisional');
                    break;
                default:
                    setPermissionStatus('unknown');
            }
        } catch (error) {
            console.error('Error checking permission status:', error);
            setPermissionStatus('unknown');
        }
    };

    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const notifee = require('@notifee/react-native').default;
            const settings = await notifee.requestPermission();
            
            if (settings.authorizationStatus >= 1) {
                setPermissionStatus('granted');
                
                // Re-initialize if permission was just granted
                if (!isInitialized) {
                    await initializePushNotifications();
                }
                
                return true;
            } else {
                setPermissionStatus('denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            setPermissionStatus('denied');
            return false;
        }
    }, [isInitialized]);

    const sendTestNotification = useCallback(async (data?: Partial<PushNotificationData>): Promise<void> => {
        const testData: PushNotificationData = {
            id: Date.now().toString(),
            title: data?.title || 'Test Notification',
            body: data?.body || 'This is a test notification from your app!',
            type: data?.type || 'update',
            data: data?.data || { test: true },
            actionButtons: data?.actionButtons || [
                {
                    id: 'mark_read',
                    title: 'Mark as Read',
                    action: 'mark_read'
                },
                {
                    id: 'open_app',
                    title: 'Open App',
                    action: 'open_app'
                }
            ],
            ...data
        };

        try {
            await pushNotificationService.sendLocalNotification(testData);
            
        } catch (error) {
            console.error('❌ Failed to send test notification:', error);
            throw error;
        }
    }, []);

    const cancelAllNotifications = useCallback(async (): Promise<void> => {
        try {
            await pushNotificationService.cancelAllNotifications();
            
        } catch (error) {
            console.error('❌ Failed to cancel notifications:', error);
            throw error;
        }
    }, []);

    const getDisplayedNotifications = useCallback(async (): Promise<any[]> => {
        try {
            return await pushNotificationService.getDisplayedNotifications();
        } catch (error) {
            console.error('❌ Failed to get displayed notifications:', error);
            return [];
        }
    }, []);

    return {
        isInitialized,
        fcmToken,
        permissionStatus,
        sendTestNotification,
        requestPermission,
        cancelAllNotifications,
        getDisplayedNotifications,
    };
};

/**
 * Hook for managing notification permission
 */
export const useNotificationPermission = () => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const notifee = require('@notifee/react-native').default;
            const settings = await notifee.getNotificationSettings();
            setHasPermission(settings.authorizationStatus >= 1);
        } catch (error) {
            console.error('Error checking notification permission:', error);
            setHasPermission(false);
        } finally {
            setIsChecking(false);
        }
    };

    const requestPermission = async (): Promise<boolean> => {
        try {
            const notifee = require('@notifee/react-native').default;
            const settings = await notifee.requestPermission();
            const granted = settings.authorizationStatus >= 1;
            setHasPermission(granted);
            return granted;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            setHasPermission(false);
            return false;
        }
    };

    return {
        hasPermission,
        isChecking,
        requestPermission,
        checkPermission,
    };
};
