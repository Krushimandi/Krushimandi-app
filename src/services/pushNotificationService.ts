/**
 * Push Notification Service
 * Integrates Firebase Cloud Messaging with Notifee for rich push notifications
 */

import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { Platform, Alert } from 'react-native';
import { addNotification, markNotificationAsRead } from './notificationService';
import { updateAppIconBadge } from '../utils/appIconBadge';

export interface PushNotificationData {
    id?: string;
    title: string;
    body: string;
    type: 'transaction' | 'promotion' | 'update' | 'alert';
    data?: any;
    imageUrl?: string;
    actionButtons?: Array<{
        id: string;
        title: string;
        action: 'mark_read' | 'open_app' | 'custom';
    }>;
}

class PushNotificationService {
    private isInitialized = false;
    private fcmToken: string | null = null;

    /**
     * Initialize push notification service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Request permission for notifications
            await this.requestPermission();

            // Create notification channels for Android
            await this.createNotificationChannels();

            // Get FCM token
            await this.getFCMToken();

            // Set up message handlers
            this.setupMessageHandlers();

            // Set up notification event handlers
            this.setupNotifeeEventHandlers();

            this.isInitialized = true;
            console.log('✅ Push notification service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize push notification service:', error);
        }
    }

    /**
     * Request notification permissions
     */
    private async requestPermission(): Promise<boolean> {
        try {
            // Request permission from Notifee
            const settings = await notifee.requestPermission();
            
            if (settings.authorizationStatus >= 1) {
                console.log('✅ Notification permission granted');
                
                // For iOS, also request Firebase messaging permission
                if (Platform.OS === 'ios') {
                    const authStatus = await messaging().requestPermission();
                    const enabled =
                        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

                    if (enabled) {
                        console.log('✅ Firebase messaging permission granted');
                        return true;
                    }
                }
                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('❌ Error requesting permission:', error);
            return false;
        }
    }

    /**
     * Create notification channels for Android
     */
    private async createNotificationChannels(): Promise<void> {
        if (Platform.OS !== 'android') return;

        try {
            // Default channel
            await notifee.createChannel({
                id: 'default',
                name: 'Default Notifications',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                badge: true,
            });

            // Transaction channel
            await notifee.createChannel({
                id: 'transactions',
                name: 'Transactions',
                description: 'Order confirmations, payments, and transaction updates',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                badge: true,
                sound: 'default',
            });

            // Promotions channel
            await notifee.createChannel({
                id: 'promotions',
                name: 'Promotions & Offers',
                description: 'Special deals, discounts, and promotional offers',
                importance: AndroidImportance.DEFAULT,
                visibility: AndroidVisibility.PUBLIC,
                badge: true,
            });

            // Updates channel
            await notifee.createChannel({
                id: 'updates',
                name: 'App Updates',
                description: 'App updates, new features, and announcements',
                importance: AndroidImportance.DEFAULT,
                visibility: AndroidVisibility.PUBLIC,
                badge: true,
            });

            // Alerts channel
            await notifee.createChannel({
                id: 'alerts',
                name: 'Important Alerts',
                description: 'Weather alerts, urgent notifications, and important updates',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                badge: true,
                sound: 'default',
            });

            console.log('✅ Android notification channels created');
        } catch (error) {
            console.error('❌ Error creating notification channels:', error);
        }
    }

    /**
     * Get FCM token
     */
    private async getFCMToken(): Promise<string | null> {
        try {
            const token = await messaging().getToken();
            this.fcmToken = token;
            console.log('✅ FCM Token obtained:', token);
            
            // Listen for token refresh
            messaging().onTokenRefresh(token => {
                this.fcmToken = token;
                console.log('🔄 FCM Token refreshed:', token);
                // You can send the new token to your server here
            });

            return token;
        } catch (error) {
            console.error('❌ Error getting FCM token:', error);
            return null;
        }
    }

    /**
     * Set up Firebase message handlers
     */
    private setupMessageHandlers(): void {
        // Handle messages when app is in foreground
        messaging().onMessage(async remoteMessage => {
            console.log('📱 Foreground message received:', remoteMessage);
            await this.handleForegroundMessage(remoteMessage);
        });

        // Handle messages when app is in background/quit
        messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('📱 Background message opened app:', remoteMessage);
            this.handleNotificationPress(remoteMessage);
        });

        // Handle messages when app is opened from quit state
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    console.log('📱 App opened from quit state by notification:', remoteMessage);
                    this.handleNotificationPress(remoteMessage);
                }
            });

        // Handle background messages
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('📱 Background message received:', remoteMessage);
            await this.handleBackgroundMessage(remoteMessage);
        });
    }

    /**
     * Set up Notifee event handlers
     */
    private setupNotifeeEventHandlers(): void {
        notifee.onForegroundEvent(({ type, detail }) => {
            console.log('🔔 Notifee foreground event:', type, detail);
            
            switch (type) {
                case EventType.DISMISSED:
                    console.log('User dismissed notification', detail.notification);
                    break;
                case EventType.PRESS:
                    console.log('User pressed notification', detail.notification);
                    this.handleNotifeePress(detail.notification);
                    break;
                case EventType.ACTION_PRESS:
                    console.log('User pressed action', detail.pressAction);
                    this.handleNotifeeActionPress(detail.pressAction, detail.notification);
                    break;
            }
        });

        notifee.onBackgroundEvent(async ({ type, detail }) => {
            console.log('🔔 Notifee background event:', type, detail);
            
            if (type === EventType.PRESS) {
                this.handleNotifeePress(detail.notification);
            } else if (type === EventType.ACTION_PRESS) {
                this.handleNotifeeActionPress(detail.pressAction, detail.notification);
            }
        });
    }

    /**
     * Handle foreground messages (app is open)
     */
    private async handleForegroundMessage(remoteMessage: any): Promise<void> {
        const notificationData = this.parseRemoteMessage(remoteMessage);
        
        // Add to local notification store
        addNotification({
            title: notificationData.title,
            message: notificationData.body,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: notificationData.type,
        });

        // Update app icon badge
        updateAppIconBadge();

        // Display local notification
        await this.displayNotification(notificationData);
    }

    /**
     * Handle background messages
     */
    private async handleBackgroundMessage(remoteMessage: any): Promise<void> {
        const notificationData = this.parseRemoteMessage(remoteMessage);
        
        // Add to local notification store
        addNotification({
            title: notificationData.title,
            message: notificationData.body,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: notificationData.type,
        });

        // Update app icon badge
        updateAppIconBadge();

        // Display notification
        await this.displayNotification(notificationData);
    }

    /**
     * Handle notification press
     */
    private handleNotificationPress(remoteMessage: any): void {
        const data = remoteMessage.data;
        
        // Navigate to appropriate screen based on notification type
        if (data?.notificationId) {
            markNotificationAsRead(data.notificationId);
            updateAppIconBadge();
        }

        // You can add navigation logic here
        // Example: navigateToScreen(data?.screen, data?.params);
    }

    /**
     * Handle Notifee notification press
     */
    private handleNotifeePress(notification: any): void {
        const data = notification?.data;
        
        if (data?.notificationId) {
            markNotificationAsRead(data.notificationId);
            updateAppIconBadge();
        }

        // Navigation logic here
    }

    /**
     * Handle Notifee action button press
     */
    private handleNotifeeActionPress(pressAction: any, notification: any): void {
        const actionId = pressAction?.id;
        const data = notification?.data;

        switch (actionId) {
            case 'mark_read':
                if (data?.notificationId) {
                    markNotificationAsRead(data.notificationId);
                    updateAppIconBadge();
                }
                break;
            case 'open_app':
                // Navigation logic to open specific screen
                break;
            default:
                console.log('Unknown action:', actionId);
        }
    }

    /**
     * Parse remote message to notification data
     */
    private parseRemoteMessage(remoteMessage: any): PushNotificationData {
        const { notification, data } = remoteMessage;
        
        return {
            id: data?.id || Date.now().toString(),
            title: notification?.title || 'New Notification',
            body: notification?.body || '',
            type: data?.type || 'update',
            data: data,
            imageUrl: notification?.android?.imageUrl || notification?.ios?.attachments?.[0]?.url,
            actionButtons: data?.actionButtons ? JSON.parse(data.actionButtons) : undefined,
        };
    }

    /**
     * Display local notification using Notifee
     */
    async displayNotification(notificationData: PushNotificationData): Promise<void> {
        try {
            const channelId = this.getChannelId(notificationData.type);
            
            const notification: any = {
                id: notificationData.id,
                title: notificationData.title,
                body: notificationData.body,
                data: {
                    notificationId: notificationData.id,
                    type: notificationData.type,
                    ...notificationData.data,
                },
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    badge: true,
                    autoCancel: true,
                    smallIcon: 'ic_notification',
                    color: this.getNotificationColor(notificationData.type),
                    visibility: AndroidVisibility.PUBLIC,
                },
                ios: {
                    badge: true,
                    sound: 'default',
                    critical: notificationData.type === 'alert',
                },
            };

            // Add image if available
            if (notificationData.imageUrl) {
                notification.android.largeIcon = notificationData.imageUrl;
                notification.android.style = {
                    type: 1, // BigPictureStyle
                    picture: notificationData.imageUrl,
                };
                notification.ios.attachments = [{
                    url: notificationData.imageUrl,
                }];
            }

            // Add action buttons
            if (notificationData.actionButtons && notificationData.actionButtons.length > 0) {
                notification.android.actions = notificationData.actionButtons.map(button => ({
                    title: button.title,
                    pressAction: {
                        id: button.id,
                    },
                }));
            }

            await notifee.displayNotification(notification);
            console.log('✅ Notification displayed successfully');
        } catch (error) {
            console.error('❌ Error displaying notification:', error);
        }
    }

    /**
     * Get channel ID based on notification type
     */
    private getChannelId(type: string): string {
        switch (type) {
            case 'transaction':
                return 'transactions';
            case 'promotion':
                return 'promotions';
            case 'update':
                return 'updates';
            case 'alert':
                return 'alerts';
            default:
                return 'default';
        }
    }

    /**
     * Get notification color based on type
     */
    private getNotificationColor(type: string): string {
        switch (type) {
            case 'transaction':
                return '#4CAF50'; // Green
            case 'promotion':
                return '#FF9800'; // Orange
            case 'update':
                return '#2196F3'; // Blue
            case 'alert':
                return '#F44336'; // Red
            default:
                return '#2196F3'; // Blue
        }
    }

    /**
     * Send local notification (for testing)
     */
    async sendLocalNotification(notificationData: PushNotificationData): Promise<void> {
        // Add to local store
        addNotification({
            title: notificationData.title,
            message: notificationData.body,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: notificationData.type,
        });

        // Update badge
        updateAppIconBadge();

        // Display notification
        await this.displayNotification(notificationData);
    }

    /**
     * Get FCM token
     */
    getFCMTokenSync(): string | null {
        return this.fcmToken;
    }

    /**
     * Cancel all notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await notifee.cancelAllNotifications();
    }

    /**
     * Cancel notification by ID
     */
    async cancelNotification(notificationId: string): Promise<void> {
        await notifee.cancelNotification(notificationId);
    }

    /**
     * Get displayed notifications
     */
    async getDisplayedNotifications(): Promise<any[]> {
        return await notifee.getDisplayedNotifications();
    }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
