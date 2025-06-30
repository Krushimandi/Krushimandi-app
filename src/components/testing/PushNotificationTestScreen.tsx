/**
 * Push Notification Test Screen
 * Test and demonstrate push notification functionality
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    TextInput,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { Colors, Layout, Typography } from '../../constants';
import { usePushNotifications, useNotificationPermission } from '../../hooks/usePushNotifications';
import { useNotifications } from '../../hooks/useNotifications';
import { updateAppIconBadge, clearAppIconBadge } from '../../utils/appIconBadge';
import Icon from 'react-native-vector-icons/Ionicons';

const PushNotificationTestScreen: React.FC = () => {
    const {
        isInitialized,
        fcmToken,
        permissionStatus,
        sendTestNotification,
        requestPermission,
        cancelAllNotifications,
        getDisplayedNotifications,
    } = usePushNotifications();

    const { hasPermission, isChecking, requestPermission: requestPermissionSimple } = useNotificationPermission();
    const { unreadCount, refreshNotifications } = useNotifications();

    const [isLoading, setIsLoading] = useState(false);
    const [testNotificationData, setTestNotificationData] = useState({
        title: 'Test Notification',
        body: 'This is a test notification from KrushiMandi!',
        type: 'update' as 'transaction' | 'promotion' | 'update' | 'alert',
        withImage: false,
        withActions: true,
    });

    const handleSendTestNotification = async () => {
        setIsLoading(true);
        try {
            const notificationData: any = {
                title: testNotificationData.title,
                body: testNotificationData.body,
                type: testNotificationData.type,
                data: { testData: 'test value' },
            };

            if (testNotificationData.withImage) {
                notificationData.imageUrl = 'https://picsum.photos/400/300';
            }

            if (testNotificationData.withActions) {
                notificationData.actionButtons = [
                    {
                        id: 'mark_read',
                        title: 'Mark as Read',
                        action: 'mark_read',
                    },
                    {
                        id: 'open_app',
                        title: 'Open App',
                        action: 'open_app',
                    },
                ];
            }

            await sendTestNotification(notificationData);
            Alert.alert('Success', 'Test notification sent successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to send test notification');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestPermission = async () => {
        setIsLoading(true);
        try {
            const granted = await requestPermission();
            Alert.alert(
                'Permission Result',
                granted ? 'Notification permission granted!' : 'Notification permission denied'
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to request permission');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelAllNotifications = async () => {
        setIsLoading(true);
        try {
            await cancelAllNotifications();
            Alert.alert('Success', 'All notifications cancelled');
        } catch (error) {
            Alert.alert('Error', 'Failed to cancel notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetDisplayedNotifications = async () => {
        setIsLoading(true);
        try {
            const notifications = await getDisplayedNotifications();
            Alert.alert('Displayed Notifications', `Found ${notifications.length} displayed notifications`);
            console.log('Displayed notifications:', notifications);
        } catch (error) {
            Alert.alert('Error', 'Failed to get displayed notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBadge = async () => {
        setIsLoading(true);
        try {
            await updateAppIconBadge();
            Alert.alert('Success', 'App icon badge updated');
        } catch (error) {
            Alert.alert('Error', 'Failed to update badge');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearBadge = async () => {
        setIsLoading(true);
        try {
            await clearAppIconBadge();
            Alert.alert('Success', 'App icon badge cleared');
        } catch (error) {
            Alert.alert('Error', 'Failed to clear badge');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'granted':
                return Colors.light.success || '#4CAF50';
            case 'denied':
                return Colors.light.error;
            case 'provisional':
                return Colors.light.warning || '#FF9800';
            default:
                return Colors.light.textSecondary;
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Push Notification Test</Text>

            {/* Status Section */}
            <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Status</Text>
                
                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Initialized:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isInitialized ? '#4CAF50' : '#F44336' }]}>
                        <Text style={styles.statusBadgeText}>
                            {isInitialized ? 'YES' : 'NO'}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Permission:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(permissionStatus) }]}>
                        <Text style={styles.statusBadgeText}>
                            {permissionStatus.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Unread Count:</Text>
                    <Text style={styles.statusValue}>{unreadCount}</Text>
                </View>

                {fcmToken && (
                    <View style={styles.tokenSection}>
                        <Text style={styles.statusLabel}>FCM Token:</Text>
                        <Text style={styles.tokenText} numberOfLines={2} ellipsizeMode="middle">
                            {fcmToken}
                        </Text>
                    </View>
                )}
            </View>

            {/* Test Notification Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Test Notification</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="Notification Title"
                    value={testNotificationData.title}
                    onChangeText={(text) => setTestNotificationData(prev => ({ ...prev, title: text }))}
                />

                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Notification Body"
                    value={testNotificationData.body}
                    onChangeText={(text) => setTestNotificationData(prev => ({ ...prev, body: text }))}
                    multiline
                    numberOfLines={3}
                />

                <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Type:</Text>
                    <View style={styles.typeButtons}>
                        {['transaction', 'promotion', 'update', 'alert'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    testNotificationData.type === type && styles.typeButtonActive
                                ]}
                                onPress={() => setTestNotificationData(prev => ({ ...prev, type: type as any }))}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    testNotificationData.type === type && styles.typeButtonTextActive
                                ]}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Include Image</Text>
                    <Switch
                        value={testNotificationData.withImage}
                        onValueChange={(value) => setTestNotificationData(prev => ({ ...prev, withImage: value }))}
                        trackColor={{ false: Colors.light.border, true: Colors.light.primary + '50' }}
                        thumbColor={testNotificationData.withImage ? Colors.light.primary : Colors.light.disabled}
                    />
                </View>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Include Action Buttons</Text>
                    <Switch
                        value={testNotificationData.withActions}
                        onValueChange={(value) => setTestNotificationData(prev => ({ ...prev, withActions: value }))}
                        trackColor={{ false: Colors.light.border, true: Colors.light.primary + '50' }}
                        thumbColor={testNotificationData.withActions ? Colors.light.primary : Colors.light.disabled}
                    />
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>

                {!hasPermission && (
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleRequestPermission}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.light.background} />
                        ) : (
                            <>
                                <Icon name="shield-checkmark" size={20} color={Colors.light.background} />
                                <Text style={styles.buttonText}>Request Permission</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleSendTestNotification}
                    disabled={isLoading || !isInitialized}
                >
                    {isLoading ? (
                        <ActivityIndicator color={Colors.light.background} />
                    ) : (
                        <>
                            <Icon name="notifications" size={20} color={Colors.light.background} />
                            <Text style={styles.buttonText}>Send Test Notification</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleUpdateBadge}
                    disabled={isLoading}
                >
                    <Icon name="refresh" size={20} color={Colors.light.primary} />
                    <Text style={[styles.buttonText, { color: Colors.light.primary }]}>Update Badge</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleClearBadge}
                    disabled={isLoading}
                >
                    <Icon name="close-circle" size={20} color={Colors.light.primary} />
                    <Text style={[styles.buttonText, { color: Colors.light.primary }]}>Clear Badge</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleGetDisplayedNotifications}
                    disabled={isLoading}
                >
                    <Icon name="list" size={20} color={Colors.light.primary} />
                    <Text style={[styles.buttonText, { color: Colors.light.primary }]}>Get Displayed Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.dangerButton]}
                    onPress={handleCancelAllNotifications}
                    disabled={isLoading}
                >
                    <Icon name="trash" size={20} color={Colors.light.background} />
                    <Text style={styles.buttonText}>Cancel All Notifications</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
        padding: Layout.spacing.md,
    },
    title: {
        fontSize: Typography.fontSize.xl,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: Layout.spacing.lg,
        color: Colors.light.text,
    },
    section: {
        backgroundColor: Colors.light.background,
        borderRadius: Layout.borderRadius.md,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.md,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    statusSection: {
        backgroundColor: Colors.light.primaryLight + '10',
        borderRadius: Layout.borderRadius.md,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.md,
        borderWidth: 1,
        borderColor: Colors.light.primary + '20',
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '600',
        marginBottom: Layout.spacing.md,
        color: Colors.light.text,
    },
    statusItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    statusLabel: {
        fontSize: Typography.fontSize.base,
        fontWeight: '500',
        color: Colors.light.text,
    },
    statusValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    statusBadge: {
        paddingHorizontal: Layout.spacing.sm,
        paddingVertical: 4,
        borderRadius: Layout.borderRadius.sm,
    },
    statusBadgeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.light.background,
    },
    tokenSection: {
        marginTop: Layout.spacing.sm,
    },
    tokenText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.light.textSecondary,
        marginTop: 4,
        fontFamily: 'monospace',
        backgroundColor: Colors.light.border + '30',
        padding: Layout.spacing.sm,
        borderRadius: Layout.borderRadius.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: Layout.borderRadius.sm,
        padding: Layout.spacing.sm,
        marginBottom: Layout.spacing.sm,
        fontSize: Typography.fontSize.base,
        color: Colors.light.text,
        backgroundColor: Colors.light.background,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        marginBottom: Layout.spacing.sm,
    },
    pickerLabel: {
        fontSize: Typography.fontSize.base,
        fontWeight: '500',
        marginBottom: Layout.spacing.xs,
        color: Colors.light.text,
    },
    typeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.spacing.xs,
    },
    typeButton: {
        paddingHorizontal: Layout.spacing.sm,
        paddingVertical: Layout.spacing.xs,
        borderRadius: Layout.borderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
        backgroundColor: Colors.light.background,
    },
    typeButtonActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    typeButtonText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.light.text,
        textTransform: 'capitalize',
    },
    typeButtonTextActive: {
        color: Colors.light.background,
        fontWeight: '600',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    switchLabel: {
        fontSize: Typography.fontSize.base,
        color: Colors.light.text,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Layout.spacing.md,
        borderRadius: Layout.borderRadius.md,
        marginBottom: Layout.spacing.sm,
        gap: Layout.spacing.xs,
    },
    primaryButton: {
        backgroundColor: Colors.light.primary,
    },
    secondaryButton: {
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.primary,
    },
    dangerButton: {
        backgroundColor: Colors.light.error,
    },
    buttonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
        color: Colors.light.background,
    },
});

export default PushNotificationTestScreen;
