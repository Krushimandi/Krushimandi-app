/**
 * Notification Service
 * Handles notification data and provides utility functions
 */

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: string;
    time?: string;
    read: boolean;
    type: 'transaction' | 'promotion' | 'update' | 'alert';
}

// Mock notification data - in a real app, this would come from an API or local storage
let notifications: Notification[] = [];

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
export const markNotificationAsRead = (id: string): void => {
    const index = notifications.findIndex(notification => notification.id === id);
    if (index !== -1) {
        notifications[index].read = true;
    }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = (): void => {
    notifications = notifications.map(notification => ({
        ...notification,
        read: true
    }));
};

/**
 * Delete notification
 * @param id - notification id
 */
export const deleteNotification = (id: string): void => {
    notifications = notifications.filter(notification => notification.id !== id);
};

/**
 * Add new notification
 * @param notification - new notification data
 */
export const addNotification = (notification: Omit<Notification, 'id'>): void => {
    const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
    };
    notifications.unshift(newNotification);
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
