/**
 * Quick Reference for Notification System
 * Copy and paste these examples into your components
 */

// ================================
// METHOD 1: Direct Function Calls
// ================================

/*
import { 
    getUnreadNotificationCount, 
    getBadgeCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../services/notificationService';

import { 
    updateAppIconBadge, 
    clearAppIconBadge 
} from '../utils/appIconBadge';

// Get current unread count
const unreadCount = getUnreadNotificationCount(); // Returns number
const badgeText = getBadgeCount(); // Returns string like "3" or "50+"

// Update app icon badge
updateAppIconBadge(); // Updates badge with current unread count
clearAppIconBadge(); // Clears the badge

// Mark notifications as read
markNotificationAsRead('notification-id');
markAllNotificationsAsRead();
*/

// ================================
// METHOD 2: React Hooks (Recommended)
// ================================

/*
import { useUnreadCount, useNotifications } from '../hooks/useNotifications';
import NotificationBadge from '../components/common/NotificationBadge';

// For just getting the unread count (lightweight):
const MyComponent1 = () => {
    const { unreadCount, badgeText, shouldShowBadge } = useUnreadCount();
    
    return (
        <Text>
            {shouldShowBadge ? `${unreadCount} unread` : 'No notifications'}
        </Text>
    );
};

// For full notification management:
const MyComponent2 = () => {
    const { 
        notifications,      // All notifications
        unreadCount,       // Unread count
        markAsRead,        // Function to mark as read
        markAllAsRead,     // Function to mark all as read
        deleteNotification, // Function to delete notification
        refreshNotifications // Function to refresh data
    } = useNotifications();
    
    return (
        <View>
            <Text>Total: {notifications.length}</Text>
            <Text>Unread: {unreadCount}</Text>
            <Button title="Mark All Read" onPress={markAllAsRead} />
        </View>
    );
};

// Badge Component Usage:
const TabWithBadge = () => (
    <View style={{ position: 'relative' }}>
        <Icon name="notifications" size={24} />
        <NotificationBadge size="small" />
    </View>
);
*/

// ================================
// FUNCTION REFERENCE
// ================================

/**
 * getUnreadNotificationCount(): number
 * - Returns the current count of unread notifications
 * 
 * getBadgeCount(): string  
 * - Returns formatted badge text ("3", "50+", etc.)
 * 
 * updateAppIconBadge(): void
 * - Updates the app icon badge with current unread count
 * 
 * clearAppIconBadge(): void
 * - Removes the app icon badge
 * 
 * markNotificationAsRead(id: string): void
 * - Marks a specific notification as read
 * 
 * markAllNotificationsAsRead(): void
 * - Marks all notifications as read
 */

// ================================
// HOOK REFERENCE  
// ================================

/**
 * useUnreadCount() returns:
 * - unreadCount: number
 * - badgeText: string
 * - shouldShowBadge: boolean
 * 
 * useNotifications() returns:
 * - notifications: Notification[]
 * - unreadCount: number
 * - badgeText: string
 * - markAsRead: (id: string) => void
 * - markAllAsRead: () => void
 * - deleteNotification: (id: string) => void
 * - getFilteredNotifications: (filter: string) => Notification[]
 * - refreshNotifications: () => void
 * - shouldShowBadge: boolean
 */

export {};
