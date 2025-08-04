/**
 * Test Notification Integration
 * Test file to verify notifications are working with Firestore
 */

import { firestoreNotificationService } from '../services/firestoreNotificationService';
import { addNotification, loadNotificationsFromFirestore } from '../services/notificationService';

export const testNotificationIntegration = async () => {
    console.log('🧪 Testing notification integration...');

    try {
        // Test 1: Simulate FCM notification received
        console.log('📱 Test 1: Simulating FCM notification...');
        await addNotification({
            title: '🚀 Test Notification',
            message: 'This is a test notification to verify Firestore integration',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'update'
        });

        // Test 2: Load notifications from Firestore
        console.log('📬 Test 2: Loading notifications from Firestore...');
        await loadNotificationsFromFirestore();

        // Test 3: Direct Firestore save (simulate your FCM message)
        console.log('💾 Test 3: Saving FCM notification directly to Firestore...');
        await firestoreNotificationService.saveFCMNotificationToFirestore(
            {
                title: '🚀 New Offer',
                body: 'Get 10% off on oranges today!',
                type: 'navigate',
                data: {
                    screen: 'MyOrdersScreen',
                    description: 'Nice1'
                }
            },
            'test-user-id' // Replace with actual user ID
        );

        console.log('✅ All notification tests completed successfully!');
        
        return {
            success: true,
            message: 'Notification integration is working correctly'
        };

    } catch (error) {
        console.error('❌ Notification test failed:', error);
        return {
            success: false,
            message: `Test failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)}`,
            error
        };
    }
};

// Export for use in components
export const sendTestNotification = async () => {
    try {
        await addNotification({
            title: '🧪 Test Notification',
            message: 'This notification should appear in your notification list and be saved to Firestore',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'promotion'
        });

        console.log('✅ Test notification sent successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to send test notification:', error);
        return false;
    }
};
