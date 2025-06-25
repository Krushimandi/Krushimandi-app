/**
 * NotificationScreen
 * Displays user notifications with modern UI and enhanced UX
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    StatusBar,
    Image,
    Animated,
    Easing,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    SectionList,
    ScrollView,
    Alert,
    ViewStyle,
    TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors, Typography, Layout } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define types for notification data
interface Notification {
    id: string;
    title: string;
    message: string;
    date: string;
    time?: string;
    read: boolean;
    type: 'transaction' | 'promotion' | 'update' | 'alert';
}

// Define section data structure
interface NotificationSection {
    title: string;
    data: Notification[];
}

interface NotificationScreenProps {
    navigation: NavigationProp<ParamListBase>;
}

// Get notification icon based on type
const getNotificationIcon = (type: string): string => {
    switch (type) {
        case 'transaction':
            return 'cash-outline';
        case 'promotion':
            return 'gift-outline';
        case 'update':
            return 'refresh-outline';
        case 'alert':
            return 'alert-circle-outline';
        default:
            return 'notifications-outline';
    }
};

// Get notification color based on type
const getNotificationColor = (type: string, theme: 'light' | 'dark' = 'light'): string => {
    const colors = Colors[theme];
    switch (type) {
        case 'unread':
            return Colors.light.tabBarInactive;
        case 'transaction':
            return colors.info;
        case 'promotion':
            return colors.secondary;
        case 'update':
            return colors.primary;
        case 'alert':
            return colors.error;
        default:
            return colors.primary;
    }
};

// Professional Switch component with fluid animation
const SimpleSwitch: React.FC<{
    value: boolean;
    onValueChange: (value: boolean) => void;
    color: string;
}> = ({ value, onValueChange, color }) => {
    const translateX = useRef(new Animated.Value(value ? 18 : 0)).current;
    const backgroundInterpolation = useRef(new Animated.Value(value ? 1 : 0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: value ? 18 : 0,
                friction: 5.5,
                tension: 60,
                useNativeDriver: true,
            }),
            Animated.timing(backgroundInterpolation, {
                toValue: value ? 1 : 0,
                duration: 200,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
            })
        ]).start();
    }, [value, translateX, backgroundInterpolation]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const backgroundColor = backgroundInterpolation.interpolate({
        inputRange: [0, 1],
        outputRange: [Colors.light.disabled + '80', color + 'E6']
    });

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Animated.View
                style={[
                    styles.switch,
                    { backgroundColor },
                    { borderColor: value ? color : Colors.light.border, borderWidth: 0.5 }
                ]}
            >
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => onValueChange(!value)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
                />
                <Animated.View
                    style={[
                        styles.switchThumb,
                        {
                            transform: [{ translateX }, { scale: value ? 1.02 : 0.98 }],
                            shadowColor: Colors.light.shadow,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.22,
                            shadowRadius: 2.22,
                            elevation: 2,
                        }
                    ]}
                />
            </Animated.View>
        </Animated.View>
    );
};

// Simple Filter Chip Component optimized for the specific design
const FilterChip: React.FC<{
    type: string;
    label: string;
    selected: boolean;
    onPress: () => void;
    icon?: string;
}> = ({ label, selected, onPress, icon, type }) => {
    const [isPressed, setIsPressed] = useState(false);
    const colors = Colors.light;

    // Use simpler animation approach for better performance
    const handlePressIn = () => {
        setIsPressed(true);
    };

    const handlePressOut = () => {
        setIsPressed(false);
    };

    return (
        <TouchableOpacity
            style={[
                styles.filterButton,
                {
                    borderColor: getNotificationColor(type),
                },
                selected && {
                    backgroundColor: getNotificationColor(type)+'40',
                },
                isPressed && {
                    opacity: 0.9,
                    transform: [{ scale: 0.98 }]
                }
            ]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
        >
            {icon && (
                <Icon
                    name={icon}
                    size={16}
                    color={getNotificationColor(type)}
                    style={{ marginRight: 6 }}
                />
            )}
            <Text
                style={[
                    styles.filterButtonText,
                    {
                        color: getNotificationColor(type),
                        fontWeight: '600',
                    }
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
    const { showTabBar, hideTabBar } = useTabBarControl();
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [sections, setSections] = useState<{ title: string; data: Notification[] }[]>([]);

    // Notification settings state
    const [settings, setSettings] = useState({
        pushNotifications: true,
        emailNotifications: false,
        transactionAlerts: true,
        promotions: true,
        updates: true,
        soundEnabled: true,
    });

    // Animated values for card appearance
    const translateY = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Mock notification data - in a real app, this would come from an API
    const mockNotifications: Notification[] = [
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

    // Filter options
    const filters = [
        { id: 'all', label: 'All', icon: 'notifications-outline' },
        { id: 'unread', label: 'Unread', icon: 'ellipse' },
        { id: 'transaction', label: 'Transactions', icon: 'cash-outline' },
        { id: 'promotion', label: 'Promotions', icon: 'gift-outline' },
        { id: 'update', label: 'Updates', icon: 'refresh-outline' },
        { id: 'alert', label: 'Alerts', icon: 'alert-circle-outline' },
    ];
    // Initialize data and animations
    useEffect(() => {
        // Simulating API fetch
        setLoading(true);
        setTimeout(() => {
            const groupedData = groupNotificationsByDate(mockNotifications);
            setSections(groupedData);
            setLoading(false);

            // Animate cards appearance with staggered animation
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 700,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.poly(4)),
                }),
            ]).start();
        }, 400);
    }, []);

    // Group notifications by date
    const groupNotificationsByDate = (notifications: Notification[]): { title: string; data: Notification[] }[] => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const getDateTitle = (dateString: string) => {
            if (dateString === today) return 'Today';
            if (dateString === yesterday) return 'Yesterday';
            return 'Earlier';
        };

        // Group notifications by date
        const groupedData: Record<string, Notification[]> = {};

        notifications.forEach(notification => {
            const dateTitle = getDateTitle(notification.date);
            if (!groupedData[dateTitle]) {
                groupedData[dateTitle] = [];
            }
            groupedData[dateTitle].push(notification);
        });

        // Convert to array of sections
        return Object.keys(groupedData).map(title => ({
            title,
            data: groupedData[title],
        }));
    };

    // Handle filter change
    useEffect(() => {
        filterNotifications(selectedFilter);
    }, [selectedFilter]);

    // Filter notifications based on active filter
    const filterNotifications = (filter: string) => {
        let filtered = [...mockNotifications];

        if (filter === 'unread') {
            filtered = filtered.filter(item => !item.read);
        } else if (filter !== 'all') {
            filtered = filtered.filter(item => item.type === filter);
        }

        setSections(groupNotificationsByDate(filtered));
    };

    // Control tab bar visibility when settings modal is open
    useEffect(() => {
        if (showSettings) {
            hideTabBar();
        } else {
            showTabBar();
        }
    }, [showSettings, hideTabBar, showTabBar]);

    // Mark notification as read
    const markAsRead = (id: string) => {
        const updatedNotifications = mockNotifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
        );

        // Navigate to notification detail
        const notification = mockNotifications.find(n => n.id === id);
        if (notification) {
            navigation.navigate('NotificationDetail', {
                title: notification.title,
                message: notification.message,
                date: notification.date,
                type: notification.type,
            });
        }
    };

    // Mark all notifications as read
    const markAllAsRead = () => {
        const updatedNotifications = mockNotifications.map(notification => ({
            ...notification,
            read: true
        }));

        // Update filtered data
        filterNotifications(selectedFilter);

        // Show confirmation
        Alert.alert('Success', 'All notifications marked as read');
    };

    // Delete notification
    const deleteNotification = (id: string) => {
        const updatedNotifications = mockNotifications.filter(notification =>
            notification.id !== id
        );

        // Update filtered data
        filterNotifications(selectedFilter);
    };
    // Animation value for refresh button
    const refreshIconRotation = useRef(new Animated.Value(0)).current;

    // Handle refresh with animation
    const handleRefresh = async () => {
        // Start rotation animation
        Animated.loop(
            Animated.timing(refreshIconRotation, {
                toValue: 1,
                duration: 800,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        setRefreshing(true);

        // Simulate API call
        setTimeout(() => {      // Stop animation
            Animated.timing(refreshIconRotation, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true
            }).stop();
            refreshIconRotation.setValue(0);

            setRefreshing(false);
            filterNotifications(selectedFilter);

            // No need for alert - native refresh control provides enough feedback
        }, 1500);
    };
    // Render notification card with modern visuals matching the app design
    const renderNotificationCard = ({ item, index }: { item: Notification, index: number }) => {
        const iconName = getNotificationIcon(item.type);
        const iconColor = getNotificationColor(item.type);

        // Create individual animated values for each card for better performance
        const cardOpacity = useRef(new Animated.Value(0)).current;
        const cardTranslateY = useRef(new Animated.Value(30)).current;
        const cardScale = useRef(new Animated.Value(1)).current;

        // Optimized staggered animation - only animate visible items
        // Calculate staggered animation delay based on index (shorter delays for smoother appearance)
        const staggerDelay = Math.min(index * 30, 200); // cap delay at 200ms for better performance with long lists

        useEffect(() => {
            // Only animate the first 15 items to improve performance
            if (index < 15) {
                Animated.sequence([
                    Animated.delay(staggerDelay),
                    Animated.parallel([
                        Animated.timing(cardOpacity, {
                            toValue: 1,
                            duration: 250,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(cardTranslateY, {
                            toValue: 0,
                            duration: 300,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        })
                    ])
                ]).start();
            } else {
                // For items further down the list, just show them without animation
                cardOpacity.setValue(1);
                cardTranslateY.setValue(0);
            }
        }, []);

        const handlePressIn = () => {
            Animated.spring(cardScale, {
                toValue: 0.98,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(cardScale, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }).start();
        };

        // Create tag component based on type
        const NotificationTag = () => {
            let tagLabel = '';
            switch (item.type) {
                case 'transaction':
                    tagLabel = 'Transaction';
                    break;
                case 'promotion':
                    tagLabel = 'Promotion';
                    break;
                case 'update':
                    tagLabel = 'Update';
                    break;
                case 'alert':
                    tagLabel = 'Alert';
                    break;
                default:
                    tagLabel = 'Notification';
            }

            return (
                <View style={[styles.cardChip, { backgroundColor: item.type === 'transaction' ? '#F0F8FF' : '#F5F5F5' }]}>
                    <Text style={styles.cardChipText}>{tagLabel}</Text>
                </View>
            );
        };
        // Simplified, cleaner card design based on the screenshot
        return (
            <Animated.View
                style={[
                    styles.notificationCardContainer,
                    {
                        opacity: cardOpacity,
                        transform: [
                            { translateY: cardTranslateY },
                            { scale: cardScale }
                        ]
                    }
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.notificationCard,
                        !item.read && styles.unreadCardHighlight
                    ]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.8}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    here
                    <View style={styles.contentContainer}>
                        <View style={styles.cardHeader}>
                            <Text style={[
                                styles.notifTitle,
                                !item.read && { fontWeight: '700', color: Colors.light.text }
                            ]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.date}>{item.time || ''}</Text>
                        </View>

                        <Text style={[
                            styles.message,
                            !item.read && { color: Colors.light.text }
                        ]} numberOfLines={2}>
                            {item.message}
                        </Text>

                        <View style={styles.cardFooter}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        width: 32,
                                        height: 32,
                                        backgroundColor: iconColor + '15',
                                    }
                                ]}
                            >
                                <Icon name={iconName} size={16} color={iconColor} />
                            </View>
                            <NotificationTag />
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // Section header component
    const renderSectionHeader = ({ section }: { section: { title: string; data: Notification[] } }) => (
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.title === 'Today' && (
                <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                    <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
            )}
        </View>
    );
    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor={Colors.light.primary}
                barStyle="light-content"
            />

            {/* Header - Updated to match design */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={Colors.light.background} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Notifications</Text>

                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => setShowSettings(true)}
                >
                    <Icon name="settings-outline" size={22} color={Colors.light.background} />
                </TouchableOpacity>
            </View>
            {/* Filter Tabs */}
            <View style={styles.filterOuterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterList}
                    decelerationRate="fast"
                    snapToAlignment="center"
                    bounces={true}
                    alwaysBounceHorizontal={false}
                >
                    {filters.map((filter, index) => (
                        <FilterChip
                            key={filter.id}
                            type={filter.id}
                            label={filter.label}
                            icon={filter.icon}
                            selected={selectedFilter === filter.id}
                            onPress={() => setSelectedFilter(filter.id)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Notifications List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            ) : (
                <>          {sections.length > 0 ? (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        renderItem={renderNotificationCard}
                        renderSectionHeader={renderSectionHeader}
                        stickySectionHeadersEnabled={false}
                        initialNumToRender={8}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[Colors.light.primary]}
                                tintColor={Colors.light.primary}
                            />
                        }
                        contentContainerStyle={styles.notificationsList}
                    />) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Icon name="notifications-off-outline" size={70} color={Colors.light.primary + '70'} />
                        </View>
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptyMessage}>
                            You don't have any {selectedFilter !== 'all' ? selectedFilter : ''} notifications in this category at the moment.
                        </Text>              <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={handleRefresh}
                            activeOpacity={0.7}
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={Colors.light.background} style={{ marginRight: 8 }} />
                            ) : (
                                <Icon name="refresh-outline" size={16} color={Colors.light.background} style={{ marginRight: 8 }} />
                            )}
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                )}
                </>
            )}

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowSettings(false)}
                >
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHandle} />

                        <Text style={styles.modalTitle}>Notification Settings</Text>

                        <View style={styles.settingItem}>
                            <View>
                                <Text style={styles.settingTitle}>Push Notifications</Text>
                                <Text style={styles.settingDescription}>
                                    Receive notifications on your device
                                </Text>
                            </View>
                            <SimpleSwitch
                                value={settings.pushNotifications}
                                onValueChange={(value) => setSettings(prev => ({ ...prev, pushNotifications: value }))}
                                color={Colors.light.primary}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View>
                                <Text style={styles.settingTitle}>Email Notifications</Text>
                                <Text style={styles.settingDescription}>
                                    Get updates in your inbox
                                </Text>
                            </View>
                            <SimpleSwitch
                                value={settings.emailNotifications}
                                onValueChange={(value) => setSettings(prev => ({ ...prev, emailNotifications: value }))}
                                color={Colors.light.primary}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View>
                                <Text style={styles.settingTitle}>Transaction Alerts</Text>
                                <Text style={styles.settingDescription}>
                                    Notifications for payments and orders
                                </Text>
                            </View>
                            <SimpleSwitch
                                value={settings.transactionAlerts}
                                onValueChange={(value) => setSettings(prev => ({ ...prev, transactionAlerts: value }))}
                                color={Colors.light.primary}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View>
                                <Text style={styles.settingTitle}>Promotions</Text>
                                <Text style={styles.settingDescription}>
                                    Deals, offers and discounts
                                </Text>
                            </View>
                            <SimpleSwitch
                                value={settings.promotions}
                                onValueChange={(value) => setSettings(prev => ({ ...prev, promotions: value }))}
                                color={Colors.light.primary}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View>
                                <Text style={styles.settingTitle}>Updates</Text>
                                <Text style={styles.settingDescription}>
                                    App updates and new features
                                </Text>
                            </View>
                            <SimpleSwitch
                                value={settings.updates}
                                onValueChange={(value) => setSettings(prev => ({ ...prev, updates: value }))}
                                color={Colors.light.primary}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowSettings(false)}
                        >
                            <Text style={styles.closeButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5', // Light gray background matching screenshot
    }, header: {
        backgroundColor: Colors.light.primary,
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight! + 10,
        paddingBottom: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 0,
        shadowColor: 'transparent',
        borderBottomWidth: 0,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: 'white',
        flex: 1,
        textAlign: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterOuterContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingVertical: 8,
        paddingBottom: 12,
    },
    filterHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 4,
        paddingTop: 4,
        backgroundColor: 'white',
    },
    filterHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
    },
    clearFilterButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    clearFilterText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.light.primary,
    },
    filterContainer: {
        paddingVertical: 4,
        backgroundColor: 'white',
        zIndex: 2,
    }, filterList: {
        paddingHorizontal: 16,
        paddingBottom: 2,
        paddingTop: 2,
    },
    filterButton: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 60,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    }, sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 16,
        backgroundColor: '#F5F5F5',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    markAllBtn: {
        padding: 5,
    },
    markAllText: {
        fontSize: 13,
        color: Colors.light.primary,
        fontWeight: '500',
    }, notificationsList: {
        paddingBottom: 20,
    },
    notificationCardContainer: {
        marginBottom: 8,
    }, notificationCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'column',
        elevation: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2.5,
        borderWidth: 0,
        borderLeftWidth: 0,  // Will be overridden for unread
    }, unreadCard: {
        backgroundColor: 'white',
        borderLeftWidth: 3,
        borderLeftColor: Colors.light.primary,
    },
    unreadCardHighlight: {
        backgroundColor: 'white',
        borderLeftWidth: 3,
        borderLeftColor: Colors.light.primary,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    }, contentContainer: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    notifTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        flex: 1,
    },
    date: {
        fontSize: 12,
        color: '#999999',
        marginLeft: 8,
    }, message: {
        fontSize: 14,
        color: '#666666',
        lineHeight: 20,
        marginBottom: 10,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.primary,
        marginLeft: 6,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        alignItems: 'center',
    }, cardChip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        borderWidth: 0,
    },
    cardChipText: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
    animatedCardContainer: {
        overflow: 'visible',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Layout.spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.light.textSecondary,
    }, emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Layout.spacing.xl,
        paddingBottom: Layout.spacing['3xl'],
    },
    emptyIconContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: Colors.light.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginTop: Layout.spacing.md,
        marginBottom: Layout.spacing.sm,
    },
    emptyMessage: {
        fontSize: Typography.fontSize.base,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
        lineHeight: 22,
        maxWidth: '80%',
    },
    refreshButton: {
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.sm,
        backgroundColor: Colors.light.primary,
        borderRadius: Layout.borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    refreshButtonText: {
        color: Colors.light.background,
        fontWeight: '600',
        fontSize: Typography.fontSize.base,
    }, modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Layout.spacing.lg,
        paddingTop: Layout.spacing.md,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 24,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.light.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: Layout.spacing.md,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: Layout.spacing.lg,
        textAlign: 'center',
    }, settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.lg,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    settingTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: Typography.fontSize.xs,
        color: Colors.light.textSecondary,
        lineHeight: 16,
        maxWidth: '80%',
    },
    switch: {
        width: 52,
        height: 32,
        borderRadius: 16,
        padding: 5,
        overflow: 'hidden',
    },
    switchThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.light.background,
    },
    closeButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: Layout.borderRadius.md,
        paddingVertical: Layout.spacing.sm,
        alignItems: 'center',
        marginTop: Layout.spacing.lg,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    closeButtonText: {
        color: Colors.light.background,
        fontSize: Typography.fontSize.base,
        fontWeight: '600',
    },
});

export default NotificationScreen;
