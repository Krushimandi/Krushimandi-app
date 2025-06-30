/**
 * Example usage of notification functions and badge
 * This demonstrates how to use the notification system anywhere in your app
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../constants';
import { 
    getUnreadNotificationCount, 
    getBadgeCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../../services/notificationService';
import { 
    updateAppIconBadge, 
    clearAppIconBadge, 
    getBadgeText,
    shouldShowBadge
} from '../../utils/appIconBadge';
import { useNotifications, useUnreadCount } from '../../hooks/useNotifications';
import NotificationBadge from '../../components/common/NotificationBadge';

const NotificationExampleScreen: React.FC = () => {
    // Method 1: Direct function calls (simple approach)
    const handleGetUnreadCount = () => {
        const count = getUnreadNotificationCount();
        const badgeText = getBadgeCount();
        Alert.alert('Unread Count', `You have ${count} unread notifications\nBadge text: ${badgeText}`);
    };

    const handleUpdateAppBadge = () => {
        updateAppIconBadge();
        Alert.alert('Badge Updated', 'App icon badge has been updated');
    };

    const handleClearAppBadge = () => {
        clearAppIconBadge();
        Alert.alert('Badge Cleared', 'App icon badge has been cleared');
    };

    const handleMarkAllAsRead = () => {
        markAllNotificationsAsRead();
        clearAppIconBadge();
        Alert.alert('Success', 'All notifications marked as read');
    };

    // Method 2: Using hooks (reactive approach - recommended)
    const { 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead,
        refreshNotifications 
    } = useNotifications();

    const { 
        unreadCount: hookUnreadCount, 
        badgeText: hookBadgeText, 
        shouldShowBadge: hookShouldShowBadge 
    } = useUnreadCount();

    const handleMarkFirstAsRead = () => {
        const firstUnread = notifications.find(n => !n.read);
        if (firstUnread) {
            markAsRead(firstUnread.id);
            Alert.alert('Marked as Read', `"${firstUnread.title}" has been marked as read`);
        } else {
            Alert.alert('No Unread', 'No unread notifications found');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notification System Demo</Text>

            {/* Display current counts */}
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>Unread Count: {hookUnreadCount}</Text>
                <Text style={styles.statsText}>Badge Text: {hookBadgeText}</Text>
                <Text style={styles.statsText}>Should Show Badge: {hookShouldShowBadge ? 'Yes' : 'No'}</Text>
                <Text style={styles.statsText}>Total Notifications: {notifications.length}</Text>
            </View>

            {/* Notification Badge Examples */}
            <View style={styles.badgeExamples}>
                <Text style={styles.sectionTitle}>Badge Examples:</Text>
                <View style={styles.badgeRow}>
                    <View style={styles.badgeContainer}>
                        <View style={styles.iconPlaceholder} />
                        <NotificationBadge size="small" />
                        <Text style={styles.badgeLabel}>Small</Text>
                    </View>
                    <View style={styles.badgeContainer}>
                        <View style={styles.iconPlaceholder} />
                        <NotificationBadge size="medium" />
                        <Text style={styles.badgeLabel}>Medium</Text>
                    </View>
                    <View style={styles.badgeContainer}>
                        <View style={styles.iconPlaceholder} />
                        <NotificationBadge size="large" />
                        <Text style={styles.badgeLabel}>Large</Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.button} onPress={handleGetUnreadCount}>
                <Text style={styles.buttonText}>Get Unread Count (Direct)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleMarkFirstAsRead}>
                <Text style={styles.buttonText}>Mark First Unread as Read</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => markAllAsRead()}>
                <Text style={styles.buttonText}>Mark All as Read (Hook)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleUpdateAppBadge}>
                <Text style={styles.buttonText}>Update App Icon Badge</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearAppBadge}>
                <Text style={[styles.buttonText, styles.clearButtonText]}>Clear App Icon Badge</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={refreshNotifications}>
                <Text style={styles.buttonText}>Refresh Notifications</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: Colors.light.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: Colors.light.text,
    },
    statsContainer: {
        backgroundColor: Colors.light.primaryLight + '20',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    statsText: {
        fontSize: 16,
        marginBottom: 5,
        color: Colors.light.text,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        color: Colors.light.text,
    },
    badgeExamples: {
        marginBottom: 20,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    badgeContainer: {
        alignItems: 'center',
        position: 'relative',
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: Colors.light.primary,
        borderRadius: 20,
        marginBottom: 10,
    },
    badgeLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginTop: 5,
    },
    button: {
        backgroundColor: Colors.light.primary,
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: Colors.light.background,
        fontSize: 16,
        fontWeight: '600',
    },
    clearButton: {
        backgroundColor: Colors.light.error,
    },
    clearButtonText: {
        color: Colors.light.background,
    },
});

export default NotificationExampleScreen;
