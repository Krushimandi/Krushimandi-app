import React from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useOfflineCapability } from '../../hooks/useOfflineCapability';

/**
 * Network Status Indicator Component
 * Shows a banner when the app is offline for 1.2 seconds with slide animations
 */
const NetworkStatusIndicator = ({ style = null }) => {
    const { isOnline, isInitialized } = useOfflineCapability();
    const [slideAnim] = React.useState(new Animated.Value(-100)); // Start above screen
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const [showIndicator, setShowIndicator] = React.useState(false);
    const [indicatorType, setIndicatorType] = React.useState('offline'); // 'offline' or 'connected'
    const timeoutRef = React.useRef(null);
    const previousOnlineState = React.useRef(null);

    React.useEffect(() => {
        if (!isInitialized) return;

        // Don't trigger on first load
        if (previousOnlineState.current === null) {
            previousOnlineState.current = isOnline;
            return;
        }

        // Only trigger when state actually changes
        if (previousOnlineState.current === isOnline) {
            return;
        }

        previousOnlineState.current = isOnline;

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!isOnline) {
            // Show offline indicator
            setIndicatorType('offline');
            setShowIndicator(true);
            
            // Slide down and fade in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            // Auto-hide after 1200ms (1.2 seconds)
            timeoutRef.current = setTimeout(() => {
                hideIndicator();
            }, 1200);

        } else {
            // Network became available - show connected message briefly
            setIndicatorType('connected');
            setShowIndicator(true);
            
            // Reset animations for connected state
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            // Hide connected message after 800ms
            timeoutRef.current = setTimeout(() => {
                hideIndicator();
            }, 800);
        }
    }, [isOnline, isInitialized]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const hideIndicator = () => {
        // Slide up and fade out
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowIndicator(false);
        });
    };

    if (!isInitialized || !showIndicator) {
        return null;
    }

    return (
        <Animated.View 
            style={[
                indicatorType === 'offline' ? styles.offlineContainer : styles.connectedContainer, 
                style, 
                { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <View style={styles.content}>
                <Icon 
                    name={indicatorType === 'offline' ? 'cloud-offline-outline' : 'wifi-outline'} 
                    size={16} 
                    color="#FFFFFF" 
                />
                <Text style={styles.text}>
                    {indicatorType === 'offline' 
                        ? "You're offline. Data will sync when connection is restored."
                        : "Connected to network"
                    }
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    offlineContainer: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 16,
        paddingVertical: 8,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    connectedContainer: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
        textAlign: 'center',
    },
});

export default NetworkStatusIndicator;
