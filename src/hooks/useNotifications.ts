/**
 * Notification Hook
 * Provides notification state and functions for components
 * Now with Firestore integration
 */

import { useState, useEffect } from 'react';
import { 
    getAllNotifications,
    getUnreadNotificationCount,
    getBadgeCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getNotificationsByType,
    loadNotificationsFromFirestore,
    subscribeToNotificationUpdates,
    addNotificationListener,
    type Notification
} from '../services/notificationService';
import { updateAppIconBadge, clearAppIconBadge } from '../utils/appIconBadge';

/**
 * Custom hook for managing notifications
 */
export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [badgeText, setBadgeText] = useState<string>('0');
    const [loading, setLoading] = useState<boolean>(true);

    // Update state from service
    const refreshNotifications = () => {
        const allNotifications = getAllNotifications();
        const count = getUnreadNotificationCount();
        const badge = getBadgeCount();
        
        setNotifications(allNotifications);
        setUnreadCount(count);
        setBadgeText(badge);
        
        // Update app icon badge
        updateAppIconBadge();
    };

    // Initialize notifications and set up real-time updates
    useEffect(() => {
        let unsubscribeFirestore: (() => void) | null = null;
        let unsubscribeListener: (() => void) | null = null;

        const initializeNotifications = async () => {
            try {
                setLoading(true);
                
                // Load initial notifications from Firestore
                await loadNotificationsFromFirestore();
                
                // Set up real-time listener
                unsubscribeFirestore = subscribeToNotificationUpdates();
                
                // Set up local change listener
                unsubscribeListener = addNotificationListener(refreshNotifications);
                
                // Initial refresh
                refreshNotifications();
                
            } catch (error) {
                console.error('❌ Error initializing notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeNotifications();

        // Cleanup function
        return () => {
            if (unsubscribeFirestore) unsubscribeFirestore();
            if (unsubscribeListener) unsubscribeListener();
        };
    }, []);

    // Mark notification as read
    const markAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        // refreshNotifications will be called automatically via listener
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        await markAllNotificationsAsRead();
        clearAppIconBadge();
        // refreshNotifications will be called automatically via listener
    };

    // Delete notification
    const deleteNotificationById = async (id: string) => {
        await deleteNotification(id);
        // refreshNotifications will be called automatically via listener
    };

    // Get notifications by filter
    const getFilteredNotifications = (filter: string) => {
        return getNotificationsByType(filter);
    };

    return {
        notifications,
        unreadCount,
        badgeText,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification: deleteNotificationById,
        getFilteredNotifications,
        refreshNotifications,
        shouldShowBadge: unreadCount > 0,
    };
};

/**
 * Simple hook to get just the unread count (for badges)
 */
export const useUnreadCount = () => {
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [badgeText, setBadgeText] = useState<string>('0');

    useEffect(() => {
        const updateCount = () => {
            const count = getUnreadNotificationCount();
            const badge = getBadgeCount();
            setUnreadCount(count);
            setBadgeText(badge);
        };

        updateCount();
        
        // You can add a listener here for real-time updates if needed
        // For now, we'll update every 30 seconds
        const interval = setInterval(updateCount, 30000);
        
        return () => clearInterval(interval);
    }, []);

    return {
        unreadCount,
        badgeText,
        shouldShowBadge: unreadCount > 0,
    };
};
