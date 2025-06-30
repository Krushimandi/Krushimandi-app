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
let notifications: Notification[] = [
    {
        id: '1',
        title: 'Order #KM2045 Confirmed',
        message: 'Your order for 5 kg of organic fertilizer has been confirmed and will be delivered within 2 days.',
        date: '2025-06-23',
        time: '10:30 AM',
        read: false,
        type: 'transaction',
    },
    {
        id: '2',
        title: 'Special Discount!',
        message: 'Get 15% off on all seeds and gardening tools this weekend. Limited time offer!',
        date: '2023-06-21',
        time: '08:15 AM',
        read: true,
        type: 'promotion',
    },
    {
        id: '3',
        title: 'App Update Available',
        message: 'KrushiMandi v2.5 is now available with new features and improvements. Update now!',
        date: '2023-06-20',
        time: '03:45 PM',
        read: false,
        type: 'update',
    },
    {
        id: '4',
        title: 'Payment Received',
        message: 'We have received your payment of ₹1,500 for order #KM2032. Thank you!',
        date: '2023-06-20',
        time: '11:20 AM',
        read: true,
        type: 'transaction',
    },
    {
        id: '5',
        title: 'Weather Alert',
        message: 'Heavy rainfall expected in your area in the next 24 hours. Please secure your crops.',
        date: '2023-06-19',
        time: '09:00 AM',
        read: false,
        type: 'alert',
    },
    {
        id: '6',
        title: 'New Article Available',
        message: 'Check out our new article on "Efficient Irrigation Methods" in the Knowledge Base.',
        date: '2023-06-18',
        time: '02:30 PM',
        read: true,
        type: 'update',
    },
    {
        id: '7',
        title: 'Your Profile is Incomplete',
        message: 'Complete your farmer profile to get personalized recommendations and updates.',
        date: '2023-06-17',
        time: '10:45 AM',
        read: true,
        type: 'alert',
    },
];

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
