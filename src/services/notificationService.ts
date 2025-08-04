/**
 * Notification Service
 * Handles notification data and provides utility functions
 * Now with Firestore integration
 */

import { firestoreNotificationService, FirestoreNotification } from './firestoreNotificationService';
import auth from '@react-native-firebase/auth';

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: string;
    time?: string;
    read: boolean;
    type: 'transaction' | 'promotion' | 'update' | 'alert';
}

// Local notification cache - synced with Firestore
let notifications: Notification[] = [];

// Notification listeners
type NotificationListener = () => void;
const listeners: NotificationListener[] = [];

/**
 * Convert Firestore notification to local notification format
 */
const convertFirestoreNotification = (fsNotification: FirestoreNotification): Notification => {
    const createdAt = fsNotification.createdAt?.toDate ? 
        fsNotification.createdAt.toDate() : 
        new Date(fsNotification.payload.createdAt);

    return {
        id: fsNotification.id,
        title: fsNotification.payload.title,
        message: fsNotification.payload.description,
        date: createdAt.toISOString().split('T')[0],
        time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: fsNotification.seen,
        type: fsNotification.category as Notification['type']
    };
};

/**
 * Notify all listeners of notification changes
 */
const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

/**
 * Add notification change listener
 */
export const addNotificationListener = (listener: NotificationListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
};

/**
 * Load notifications from Firestore
 */
export const loadNotificationsFromFirestore = async (): Promise<void> => {
    try {
        const currentUser = auth().currentUser;
        if (!currentUser) {
            console.log('❌ No authenticated user, cannot load notifications');
            return;
        }

        console.log('📬 Loading notifications from Firestore...');
        const firestoreNotifications = await firestoreNotificationService.loadUserNotifications(currentUser.uid);
        
        // Convert and update local cache
        notifications = firestoreNotifications.map(convertFirestoreNotification);
        
        console.log('✅ Loaded', notifications.length, 'notifications from Firestore');
        notifyListeners();
    } catch (error) {
        console.error('❌ Error loading notifications from Firestore:', error);
    }
};

/**
 * Subscribe to real-time notification updates
 */
export const subscribeToNotificationUpdates = (): (() => void) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        console.log('❌ No authenticated user, cannot subscribe to notifications');
        return () => {};
    }

    console.log('🔔 Subscribing to real-time notification updates...');
    
    return firestoreNotificationService.subscribeToNotifications(
        currentUser.uid,
        (firestoreNotifications) => {
            // Convert and update local cache
            notifications = firestoreNotifications.map(convertFirestoreNotification);
            notifyListeners();
        }
    );
};

/**
 * Get all notifications
 */
export const getAllNotifications = (): Notification[] => {
    return notifications;
};

/**
 * Get unread notification count
 * @returns number of unread notifications
 */
export const getUnreadNotificationCount = (): number => {
    return notifications.filter(notification => !notification.read).length;
};

/**
 * Get formatted badge count for display
 * @returns string - shows "50+" if count > 50, otherwise the actual count
 */
export const getBadgeCount = (): string => {
    const count = getUnreadNotificationCount();
    return count > 50 ? '50+' : count.toString();
};

/**
 * Mark notification as read
 * @param id - notification id
 */
export const markNotificationAsRead = async (id: string): Promise<void> => {
    // Update local cache
    const index = notifications.findIndex(notification => notification.id === id);
    if (index !== -1) {
        notifications[index].read = true;
    }

    // Update in Firestore
    await firestoreNotificationService.markAsRead(id);
    notifyListeners();
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    // Update local cache
    notifications = notifications.map(notification => ({
        ...notification,
        read: true
    }));

    // Update in Firestore
    await firestoreNotificationService.markAllAsRead(currentUser.uid);
    notifyListeners();
};

/**
 * Delete notification
 * @param id - notification id
 */
export const deleteNotification = async (id: string): Promise<void> => {
    // Update local cache
    notifications = notifications.filter(notification => notification.id !== id);

    // Delete from Firestore
    await firestoreNotificationService.deleteNotification(id);
    notifyListeners();
};

/**
 * Add new notification (called when FCM notification is received)
 * @param notification - new notification data
 */
export const addNotification = async (notification: Omit<Notification, 'id'>): Promise<void> => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
        console.log('❌ No authenticated user, cannot save notification');
        return;
    }

    const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
    };

    // Add to local cache
    notifications.unshift(newNotification);

    // Save to Firestore (this will be automatically synced via real-time listener)
    await firestoreNotificationService.saveFCMNotificationToFirestore(
        {
            title: notification.title,
            body: notification.message,
            type: notification.type,
            data: {}
        },
        currentUser.uid
    );

    notifyListeners();
};

/**
 * Get notifications by type
 * @param type - notification type
 */
export const getNotificationsByType = (type: string): Notification[] => {
    if (type === 'all') return notifications;
    if (type === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === type);
};
