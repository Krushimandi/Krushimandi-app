/**
 * Notification Hook
 * Provides notification state and functions for components
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

    // Initialize notifications
    useEffect(() => {
        refreshNotifications();
    }, []);

    // Mark notification as read
    const markAsRead = (id: string) => {
        markNotificationAsRead(id);
        refreshNotifications();
    };

    // Mark all notifications as read
    const markAllAsRead = () => {
        markAllNotificationsAsRead();
        clearAppIconBadge();
        refreshNotifications();
    };

    // Delete notification
    const deleteNotificationById = (id: string) => {
        deleteNotification(id);
        refreshNotifications();
    };

    // Get notifications by filter
    const getFilteredNotifications = (filter: string) => {
        return getNotificationsByType(filter);
    };

    return {
        notifications,
        unreadCount,
        badgeText,
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
