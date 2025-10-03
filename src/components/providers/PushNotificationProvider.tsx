/**
 * Push Notification Provider
 * Initializes and manages push notifications for the entire app
 */

import React, { useEffect, createContext, useContext } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { updateAppIconBadge } from '../../utils/appIconBadge';

interface PushNotificationContextType {
    isInitialized: boolean;
    fcmToken: string | null;
    permissionStatus: 'unknown' | 'granted' | 'denied' | 'provisional';
    sendTestNotification: (data?: any) => Promise<void>;
    requestPermission: () => Promise<boolean>;
    cancelAllNotifications: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export const usePushNotificationContext = () => {
    const context = useContext(PushNotificationContext);
    if (!context) {
        throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
    }
    return context;
};

interface PushNotificationProviderProps {
    children: React.ReactNode;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
    const pushNotifications = usePushNotifications();

    // Update badge when app becomes active
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // Update badge count when app becomes active
                await updateAppIconBadge();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    // Log initialization status
    useEffect(() => {
        if (pushNotifications.isInitialized) {
            
        }
    }, [pushNotifications.isInitialized, pushNotifications.fcmToken, pushNotifications.permissionStatus]);

    return (
        <PushNotificationContext.Provider value={pushNotifications}>
            {children}
        </PushNotificationContext.Provider>
    );
};
