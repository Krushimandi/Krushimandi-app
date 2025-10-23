/**
 * NotificationScreen
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    StatusBar,
    Animated,
    Easing,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    SectionList,
    ScrollView,
    PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Colors, Typography, Layout } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls';
import { useNotifications } from '../../hooks/useNotifications';
import { useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import ErrorBoundary from '../common/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import {
    loadNotificationPreferences,
    saveNotificationPreferences,
    NotificationPreferences
} from '../../services/notificationPreferencesService';

// Import notification type from service to avoid conflicts
import { Notification } from '../../services/notificationService';
import { HapticFeedback } from 'utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            return Colors.light.secondary;
        case 'transaction':
            return colors.info;
        case 'promotion':
            return colors.tabBarInactive;
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
    }, [value]);

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

        // Trigger haptic feedback
        HapticFeedback.toggleSwitch();

        // Trigger change after animation starts for better feel
        onValueChange(!value);
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
    // const colors = Colors.light;

    const borderColor = '#525252ff';
    const textColor = '#4d4d4dff';



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
                    borderColor: borderColor,
                },
                selected && {
                    backgroundColor: '#E5E7EB',
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
                    color={textColor}
                    style={{ marginRight: 6 }}
                />
            )}
            <Text
                style={[
                    styles.filterButtonText,
                    {
                        color: textColor,
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
    const { t } = useTranslation();
    const [authError, setAuthError] = useState<string | null>(null);
    const currentUser = auth().currentUser;

    // Debounce timer for saving preferences
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const insets = useSafeAreaInsets();

    // Validate user authentication
    useEffect(() => {
        if (!currentUser) {
            setAuthError('User not authenticated');
            return;
        }
        setAuthError(null);
    }, [currentUser]);

    const {
        notifications,
        unreadCount,
        loading: hookLoading,
        markAsRead: markNotificationAsRead,
        markAllAsRead: markAllNotificationsAsRead,
        deleteNotification,
        getFilteredNotifications,
        refreshNotifications
    } = useNotifications();

    // Auto-refresh notifications on screen focus
    useFocusEffect(
        useCallback(() => {
            if (!authError && currentUser) {
                refreshNotifications();
            }
        }, [authError, currentUser?.uid, refreshNotifications])
    );

    // Group notifications by date
    const groupNotificationsByDate = React.useCallback((notifications: Notification[]): { title: string; data: Notification[] }[] => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const getDateTitle = (dateString: string) => {
            if (dateString === today) return t('notifications.section.today');
            if (dateString === yesterday) return t('notifications.section.yesterday');
            return t('notifications.section.earlier');
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
    }, [t]);

    // Filter notifications based on active filter (improved logic)
    const filterNotifications = React.useCallback((filter: string) => {
        // Only update the selected filter; sections are derived from state to avoid flicker
        setSelectedFilter(filter);
    }, []);

    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    // Derive sections from notifications and selected filter to prevent empty-state flicker
    const sectionsMemo = useMemo(() => {
        let filtered: Notification[] = [];
        if (selectedFilter === 'all') {
            filtered = notifications;
        } else if (selectedFilter === 'unread') {
            filtered = notifications.filter(n => !n.read);
        } else {
            filtered = notifications.filter(n => n.type === selectedFilter);
        }
        return groupNotificationsByDate(filtered);
    }, [notifications, selectedFilter, groupNotificationsByDate]);

    // Notification settings state
    const [settings, setSettings] = useState<NotificationPreferences>({
        pushNotifications: true,
        emailNotifications: false,
        transactionAlerts: true,
        promotions: true,
        updates: true,
        soundEnabled: true,
    });

    // Load preferences on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const prefs = await loadNotificationPreferences();
                setSettings(prefs);
            } catch (error) {
                console.error('Error loading preferences:', error);
            }
        };
        loadPreferences();
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Debounced save function - saves after 1 second of no changes
    const debouncedSave = useCallback((newSettings: NotificationPreferences) => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveNotificationPreferences(newSettings);
                console.log('✅ Preferences saved to network');
                Toast.show({
                    type: 'success',
                    text1: t('notifications.toast.preferencesSaved'),
                    position: 'bottom',
                    visibilityTime: 1500,
                });
            } catch (error) {
                console.error('❌ Error saving preferences:', error);
                Toast.show({
                    type: 'error',
                    text1: t('notifications.toast.preferencesError'),
                    position: 'bottom',
                    visibilityTime: 2000,
                });
            }
        }, 1000); // Wait 1 second after last change
    }, [t]);

    // Save preferences when they change (optimistic UI update)
    const handlePreferenceChange = useCallback((key: keyof NotificationPreferences, value: boolean) => {
        // Immediate UI update (optimistic)
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        // Debounced network save
        debouncedSave(newSettings);
    }, [settings, debouncedSave]);

    // Animated values for card appearance
    const translateY = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Modal animation values
    const modalTranslateY = useRef(new Animated.Value(0)).current;
    const modalOpacity = useRef(new Animated.Value(1)).current;

    // Filter options
    const filters = useMemo(() => ([
        { id: 'all', label: t('notifications.filters.all'), icon: 'notifications-outline' },
        { id: 'unread', label: t('notifications.filters.unread'), icon: 'ellipse' },
        { id: 'request', label: t('notifications.filters.request'), icon: 'help-buoy-outline' },
        { id: 'promotion', label: t('notifications.filters.promotion'), icon: 'gift-outline' },
        { id: 'update', label: t('notifications.filters.update'), icon: 'refresh-outline' },
        { id: 'message', label: t('notifications.filters.message'), icon: 'chatbubble-ellipses-outline' },
        { id: 'alert', label: t('notifications.filters.alert'), icon: 'alert-circle-outline' },
    ]), [t]);

    // Pan responder for modal swipe-down gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to vertical gestures
                return Math.abs(gestureState.dy) > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderGrant: () => {
                modalTranslateY.setOffset(0);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward drag
                if (gestureState.dy > 0) {
                    modalTranslateY.setValue(gestureState.dy);
                    // Fade out as user drags down
                    const opacity = 1 - gestureState.dy / 300;
                    modalOpacity.setValue(Math.max(0.3, opacity));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If dragged down more than 150px, close the modal
                if (gestureState.dy > 150) {
                    Animated.parallel([
                        Animated.timing(modalTranslateY, {
                            toValue: 600,
                            duration: 250,
                            useNativeDriver: true,
                            easing: Easing.out(Easing.cubic),
                        }),
                        Animated.timing(modalOpacity, {
                            toValue: 0,
                            duration: 250,
                            useNativeDriver: true,
                        })
                    ]).start(() => {
                        setShowSettings(false);
                        // Reset animations
                        modalTranslateY.setValue(0);
                        modalOpacity.setValue(1);
                    });
                } else {
                    // Spring back to original position
                    Animated.parallel([
                        Animated.spring(modalTranslateY, {
                            toValue: 0,
                            friction: 8,
                            tension: 80,
                            useNativeDriver: true,
                        }),
                        Animated.timing(modalOpacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        })
                    ]).start();
                }
            },
        })
    ).current;

    // Animate in when notifications change and user is ready
    useEffect(() => {
        if (authError || notifications.length === 0) return;
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
                easing: Easing.out(Easing.poly(4)),
            }),
        ]).start();
    }, [notifications.length, authError]);

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
        // Mark as read using hook function
        markNotificationAsRead(id);

        // Navigate to notification detail
        const notification = notifications.find((n: Notification) => n.id === id);
        if (notification) {
            navigation.navigate('NotificationDetail', {
                ...notification,
                offer: notification.offer,
                actionUrl: notification.actionUrl,
                category: notification.category,
                createdAt: notification.createdAt,
            });
        }
    };

    // Mark all notifications as read
    const markAllAsRead = () => {
        // Mark all as read using hook function
        markAllNotificationsAsRead();

        // Show confirmation
        Toast.show({
            type: 'success',
            text1: t('notifications.toast.successTitle'),
            text2: t('notifications.toast.allMarkedRead'),
            position: 'bottom',
            visibilityTime: 1000,
        });
    };

    // Delete notification
    const deleteNotificationHandler = (id: string) => {
        // Delete using hook function
        deleteNotification(id);
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

        try {
            await refreshNotifications();
        } finally {
            // Stop animation
            Animated.timing(refreshIconRotation, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true
            }).stop();
            refreshIconRotation.setValue(0);
            setRefreshing(false);
        }
    };
    // Render notification card with modern visuals matching the app design
    const renderNotificationCard = useCallback(({ item, index }: { item: Notification, index: number }) => {
        const iconName = getNotificationIcon(item.type);
        const iconColor = getNotificationColor(item.type);
        console.log(item);

        return (
            <View style={styles.notificationCardContainer}>
                <TouchableOpacity
                    style={[
                        styles.notificationCard,
                        !item.read && styles.unreadCardHighlight
                    ]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.9}
                >
                    {/* Icon First - Bigger Size - Centered */}
                    <View
                        style={[
                            styles.iconCircle,
                            {
                                width: 48,
                                height: 48,
                                backgroundColor: iconColor + '15',
                            }
                        ]}
                    >
                        <Icon name={iconName} size={24} color={iconColor} />
                    </View>

                    {/* Content beside icon */}
                    <View style={styles.contentContainer}>
                        {/* Title and Time on same line */}
                        <View style={styles.cardHeader}>
                            <Text style={[
                                styles.notifTitle,
                                !item.read && { fontWeight: '700', color: Colors.light.text }
                            ]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.date}>{item.time || ''}</Text>
                        </View>

                        {/* Subtitle/Body */}
                        <Text style={[
                            styles.body,
                            !item.read && { color: Colors.light.text }
                        ]} numberOfLines={2}>
                            {item.body || item.message}
                        </Text>

                        {/* Render offer/extra info for each type */}
                        {item.type === 'promotion' && item.offer && (
                            <Text style={{ color: Colors.light.secondary, fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>
                                {t('notifications.offer.coupon')}: {item.offer[0]?.text} | {t('notifications.offer.valid')}: {item.offer[0]?.validity}
                            </Text>
                        )}
                        {item.type === 'update' && item.offer && (
                            <Text style={{ color: Colors.light.primary, fontSize: 12, marginTop: 2 }}>
                                {t('notifications.offer.version')}: {item.offer[0]?.text}
                            </Text>
                        )}
                        {item.type === 'alert' && item.offer && (
                            <Text style={{ color: Colors.light.error, fontSize: 12, marginTop: 2 }}>{item.offer[0]?.text}</Text>
                        )}
                        {item.type === 'request' && item.offer && (
                            <Text style={{ color: Colors.light.info, fontSize: 12, marginTop: 2 }}>
                                {t('notifications.offer.request')}: {item.offer[0]?.requestId} | {t('notifications.offer.status')}: {item.offer[0]?.status}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    }, [t, markAsRead]);

    // Section header component
    const renderSectionHeader = ({ section }: { section: { title: string; data: Notification[] } }) => (
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.title === t('notifications.section.today') && (
                <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                    <Text style={styles.markAllText}>{t('notifications.buttons.markAllAsRead')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
    return (
        <ErrorBoundary fallback={<Text>{t('notifications.errors.generic')}</Text>}>
            <View style={styles.container}>
                {/* Handle authentication errors */}
                {authError && (
                    <View style={styles.errorContainer}>
                        <Icon name="person-outline" size={48} color={Colors.light.disabled} />
                        <Text style={styles.errorTitle}>{t('notifications.errors.authRequiredTitle')}</Text>
                        <Text style={styles.errorMessage}>{t('notifications.errors.authRequiredMessage')}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.retryButtonText}>{t('notifications.buttons.signIn')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main content - only show when authenticated */}
                {!authError && (
                    <>
                        <StatusBar
                            backgroundColor="#FFFFFF"
                            barStyle="dark-content"
                        />

                        {/* Header - Matching MyOrdersScreen/RequestsScreen design */}
                        <View style={[styles.header, {
                            paddingTop: Platform.OS === 'android' ? insets.top : 16,
                        }]}>
                            <View style={styles.headerTop}>
                                <View>
                                    <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
                                    <Text style={styles.headerSubtitle}>
                                        {t('notifications.subtitle', { count: notifications.length, unread: unreadCount })}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.settingsButton}
                                    onPress={() => setShowSettings(true)}
                                >
                                    <Icon name="settings-outline" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>
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
                                        onPress={() => {
                                            setSelectedFilter(filter.id);
                                        }}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Notifications List - Show loading only on initial load */}
                        {hookLoading && notifications.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.light.primary} />
                                <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
                            </View>
                        ) : (
                            // Only show SectionList if there is at least one notification in any section
                            notifications.length > 0 && sectionsMemo.some(section => section.data.length > 0) ? (
                                <SectionList
                                    sections={sectionsMemo}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderNotificationCard}
                                    renderSectionHeader={renderSectionHeader}
                                    stickySectionHeadersEnabled={false}
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={10}
                                    windowSize={10}
                                    removeClippedSubviews={true}
                                    updateCellsBatchingPeriod={50}
                                    getItemLayout={(data, index) => ({
                                        length: 120,
                                        offset: 120 * index,
                                        index,
                                    })}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={handleRefresh}
                                            colors={[Colors.light.primary]}
                                            tintColor={Colors.light.primary}
                                        />
                                    }
                                    contentContainerStyle={styles.notificationsList}
                                />
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Icon name="notifications-off-outline" size={56} color={Colors.light.primary + '70'} />
                                    </View>
                                    <Text style={styles.emptyTitle}>
                                        {selectedFilter === 'all' ? t('notifications.emptyTitleAll') : t('notifications.emptyTitleFilter', { filter: t(`notifications.filters.${selectedFilter}`) })}
                                    </Text>
                                    <Text style={styles.emptyMessage}>
                                        {selectedFilter === 'all'
                                            ? t('notifications.emptyMessageAll')
                                            : t('notifications.emptyMessageFilter', { filter: t(`notifications.filters.${selectedFilter}`) })
                                        }
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.refreshButton}
                                        onPress={() => {
                                            if (selectedFilter !== 'all') {
                                                setSelectedFilter('all');
                                            } else {
                                                handleRefresh();
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        {refreshing ? (
                                            <ActivityIndicator size="small" color={Colors.light.background} style={{ marginRight: 8 }} />
                                        ) : (
                                            <Icon
                                                name={selectedFilter !== 'all' ? "close-outline" : "refresh-outline"}
                                                size={16}
                                                color={Colors.light.background}
                                                style={{ marginRight: 8 }}
                                            />
                                        )}
                                        <Text style={styles.refreshButtonText}>
                                            {selectedFilter !== 'all' ? t('notifications.buttons.clearFilter') : t('notifications.buttons.refresh')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )
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
                                <Animated.View
                                    style={[
                                        styles.modalContent,
                                        {
                                            transform: [{ translateY: modalTranslateY }],
                                            opacity: modalOpacity,
                                        }
                                    ]}
                                >
                                    <View {...panResponder.panHandlers} style={styles.modalHandleArea}>
                                        <View style={styles.modalHandle} />
                                    </View>

                                    <Text style={styles.modalTitle}>{t('notifications.settings.title')}</Text>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingTitle}>{t('notifications.settings.pushTitle')}</Text>
                                            <Text style={styles.settingDescription}>
                                                {t('notifications.settings.pushDesc')}
                                            </Text>
                                        </View>
                                        <SimpleSwitch
                                            value={settings.pushNotifications}
                                            onValueChange={(value) => handlePreferenceChange('pushNotifications', value)}
                                            color={Colors.light.primary}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingTitle}>{t('notifications.settings.emailTitle')}</Text>
                                            <Text style={styles.settingDescription}>
                                                {t('notifications.settings.emailDesc')}
                                            </Text>
                                        </View>
                                        <SimpleSwitch
                                            value={settings.emailNotifications}
                                            onValueChange={(value) => handlePreferenceChange('emailNotifications', value)}
                                            color={Colors.light.primary}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingTitle}>{t('notifications.settings.transactionTitle')}</Text>
                                            <Text style={styles.settingDescription}>
                                                {t('notifications.settings.transactionDesc')}
                                            </Text>
                                        </View>
                                        <SimpleSwitch
                                            value={settings.transactionAlerts}
                                            onValueChange={(value) => handlePreferenceChange('transactionAlerts', value)}
                                            color={Colors.light.primary}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingTitle}>{t('notifications.settings.promotionsTitle')}</Text>
                                            <Text style={styles.settingDescription}>
                                                {t('notifications.settings.promotionsDesc')}
                                            </Text>
                                        </View>
                                        <SimpleSwitch
                                            value={settings.promotions}
                                            onValueChange={(value) => handlePreferenceChange('promotions', value)}
                                            color={Colors.light.primary}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingTitle}>{t('notifications.settings.updatesTitle')}</Text>
                                            <Text style={styles.settingDescription}>
                                                {t('notifications.settings.updatesDesc')}
                                            </Text>
                                        </View>
                                        <SimpleSwitch
                                            value={settings.updates}
                                            onValueChange={(value) => handlePreferenceChange('updates', value)}
                                            color={Colors.light.primary}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setShowSettings(false)}
                                    >
                                        <Text style={styles.closeButtonText}>{t('notifications.buttons.saveChanges')}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </Pressable>
                        </Modal>
                    </>
                )}
            </View>
        </ErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.7,
        lineHeight: 36,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    settingsButton: {
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    filterOuterContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderBottomColor: '#EEEEEE',
        borderTopColor: '#EEEEEE8C',
        paddingVertical: 8,
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
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
        paddingTop: 8,
        backgroundColor: '#F5F5F5',
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
    },
    notificationsList: {
        gap: 4,
    },
    notificationCardContainer: {
        marginBottom: 6,
    }, notificationCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        flexDirection: 'row',
        elevation: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2.5,
        borderWidth: 0,
        borderLeftWidth: 0,  // Will be overridden for unread
        alignItems: 'center',
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
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    }, contentContainer: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333333',
        lineHeight: 20,
        flex: 1,
        marginRight: 8,
    },
    date: {
        fontSize: 11,
        color: '#999999',
        flexShrink: 0,
    }, body: {
        fontSize: 13,
        color: '#666666',
        lineHeight: 18,
        marginBottom: 4,
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
        justifyContent: 'flex-start',
        marginTop: 4,
        alignItems: 'center',
    }, cardChip: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 0,
    },
    cardChipText: {
        fontSize: 11,
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
        width: 110,
        height: 110,
        borderRadius: 65,
        backgroundColor: Colors.light.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
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
    },
    modalOverlay: {
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
    modalHandleArea: {
        paddingVertical: Layout.spacing.sm,
        paddingTop: Layout.spacing.md,
        marginBottom: Layout.spacing.xs,
        alignItems: 'center',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.light.border,
        borderRadius: 3,
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
    // Error state styles
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#F5F5F5',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.light.text,
        marginTop: 16,
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 16,
        color: Colors.light.disabled,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default NotificationScreen;
