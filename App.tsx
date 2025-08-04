/**
 * KrushiMandi App
 */

import React, { useEffect, useState, useRef } from 'react';
import messaging from '@react-native-firebase/messaging';
import { navigationRef, isNavigationReady, pendingNotificationData, handleNotificationNavigation } from './src/navigation/navigationService';
import { notificationTabEmitter } from './src/navigation/buyer/notificationTabEmitter';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RNBootSplash from 'react-native-bootsplash';
import { AppNavigator } from './src/navigation';
import { Colors } from './src/constants';
import './global.css';
import './src/config/appCheckSetup';
import './src/config/firebase';
import Toast from 'react-native-toast-message';
import { AppBootstrapScreen } from './src/components/common/AppBootstrapScreen';
import { AuthStateProvider } from './src/components/providers/AuthStateProvider';
import { AuthBootstrapState } from './src/utils/authBootstrap';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { initializeNetworkMonitoring } from './src/services/firebaseService';
import { notificationInitService } from './src/services/notificationInitService';
import NetworkStatusIndicator from './src/components/common/NetworkStatusIndicator';

// In App.js or index.js
import { LogBox } from 'react-native';

const App: React.FC = () => {
    LogBox.ignoreAllLogs(true); // Hide all warnings

    const isDark = false;
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [bootstrapState, setBootstrapState] = useState<AuthBootstrapState | null>(null);

    // Initialize push notifications
    const {
        isInitialized: isPushInitialized,
        fcmToken,
        permissionStatus,
        requestPermission: requestPushPermission
    } = usePushNotifications();


    // Initialize network monitoring on app start
    useEffect(() => {
        console.log('📶 Initializing network monitoring...');
        initializeNetworkMonitoring();
        
        // Initialize notification system
        console.log('🔔 Initializing notification system...');
        const cleanupNotifications = notificationInitService.initialize();
        
        // Return cleanup function
        return () => {
            cleanupNotifications();
        };
    }, []);

    useEffect(() => {
        // Hide splash screen after bootstrap is complete
        if (isBootstrapped) {
            RNBootSplash.hide({ fade: true });
        }
    }, [isBootstrapped]);

    // No-op: now handled in navigationService.tsx

    useEffect(() => {
        // When app is in background and user taps notification
        const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
            if (remoteMessage?.data) {
                handleNotificationNavigation(remoteMessage.data, notificationTabEmitter);
            }
        });

        // When app is opened from quit state by tapping notification
        messaging().getInitialNotification().then(remoteMessage => {
            if (remoteMessage?.data) {
                handleNotificationNavigation(remoteMessage.data, notificationTabEmitter);
            }
        });

        return unsubscribe;
    }, []);
    // Log FCM token when available (for development/debugging)
    useEffect(() => {
        if (fcmToken) {
            console.log('🔔 FCM Token received:', fcmToken);
            // TODO: Send this token to your backend server for push notification targeting
        }
    }, [fcmToken]);

    // Log push notification initialization status
    useEffect(() => {
        if (isPushInitialized) {
            console.log('🔔 Push notifications initialized successfully');
            console.log('🔔 Permission status:', permissionStatus);

            // Request permission if not granted and app is bootstrapped
            if (isBootstrapped && permissionStatus === 'unknown') {
                requestPushPermission().then((granted) => {
                    console.log('🔔 Push permission requested:', granted ? 'granted' : 'denied');
                });
            }
        }
    }, [isPushInitialized, permissionStatus, isBootstrapped, requestPushPermission]);

    const handleBootstrapComplete = (state: AuthBootstrapState) => {
        console.log('🚀 Bootstrap completed:', state);
        setBootstrapState(state);
        setIsBootstrapped(true);
    };

    // Show bootstrap screen while initializing
    if (!isBootstrapped || !bootstrapState) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar
                    barStyle={isDark ? 'light-content' : 'dark-content'}
                    backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
                    translucent
                />
                <AppBootstrapScreen
                    onBootstrapComplete={handleBootstrapComplete}
                    minimumSplashTime={2500} // Show splash for at least 2.5 seconds
                />
            </GestureHandlerRootView>
        );
    }

    // App is bootstrapped, show main navigation
    return (
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => { }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
                translucent
            />
            <NetworkStatusIndicator />
            <AuthStateProvider bootstrapState={bootstrapState}>
                <AppNavigator bootstrapState={bootstrapState} />
            </AuthStateProvider>
            <Toast />
        </GestureHandlerRootView>
    );
};

export default App;
