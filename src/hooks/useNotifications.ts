/**
 * Notification Hook
 * Provides notification state and functions for components
 * Now with Firestore integration
 */

import { useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebaseModular';
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

    // Update state from service with debug logging
    const refreshNotifications = () => {
    const currentUser = auth.currentUser;
        if (!currentUser) {
            
            setNotifications([]);
            setUnreadCount(0);
            setBadgeText('0');
            return;
        }

        const allNotifications = getAllNotifications();
        const count = getUnreadNotificationCount();
        const badge = getBadgeCount();
        
        
        
        // Debug: Log first few notifications to verify user filtering
        if (allNotifications.length > 0) {
            
        }
        
        setNotifications(allNotifications);
        setUnreadCount(count);
        setBadgeText(badge);
        
        // Update app icon badge
        updateAppIconBadge();
    };

    // Initialize notifications and set up real-time updates with user validation
    useEffect(() => {
        let unsubscribeFirestore: (() => void) | null = null;
        let unsubscribeListener: (() => void) | null = null;

        const initializeNotifications = async () => {
            try {
                setLoading(true);
                
                // Check if user is authenticated before loading notifications
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    
                    setNotifications([]);
                    setUnreadCount(0);
                    setBadgeText('0');
                    setLoading(false);
                    return;
                }

                
                
                // Load initial notifications from Firestore (already user-filtered)
                await loadNotificationsFromFirestore();
                
                // Set up real-time listener (already user-filtered)
                unsubscribeFirestore = subscribeToNotificationUpdates();
                
                // Set up local change listener
                unsubscribeListener = addNotificationListener(refreshNotifications);
                
                // Initial refresh
                refreshNotifications();
                
            } catch (error) {
                console.error('❌ Error initializing notifications:', error);
                // Set empty state on error
                setNotifications([]);
                setUnreadCount(0);
                setBadgeText('0');
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

    // Get notifications by filter with user validation
    const getFilteredNotifications = (filter: string) => {
    const currentUser = auth.currentUser;
        if (!currentUser) {
            
            return [];
        }
        
        const filtered = getNotificationsByType(filter);
        
        return filtered;
    };

    // Force refresh notifications for current user (fixed infinite loop)
    const forceRefreshNotifications = useCallback(async () => {
    const currentUser = auth.currentUser;
        if (!currentUser) {
            
            return;
        }
        
        
        
        try {
            // Don't set loading true here to prevent infinite loops
            // Just reload from Firestore and refresh state
            await loadNotificationsFromFirestore();
            // refreshNotifications() will be called automatically via the listener
        } catch (error) {
            console.error('❌ Error force refreshing notifications:', error);
        }
        // Don't set loading false here - let the natural flow handle it
    }, []); // Empty dependencies to prevent recreation

    return {
        notifications,
        unreadCount,
        badgeText,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification: deleteNotificationById,
        getFilteredNotifications,
        refreshNotifications: forceRefreshNotifications, // Use force refresh instead
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

        // Use the notification listener for real-time updates instead of polling
        const unsubscribe = addNotificationListener(updateCount);

        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    return {
        unreadCount,
        badgeText,
        shouldShowBadge: unreadCount > 0,
    };
};
