/**
 * Krushimandi App
 * @version 1.0.0
 * @author Rushikesh-Satpute
 * @date 2025-01-05
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getApp } from '@react-native-firebase/app';
import {
    getMessaging,
    onNotificationOpenedApp,
    getInitialNotification,
} from '@react-native-firebase/messaging';
// Modular Cloud Functions import
import { getFunctions, httpsCallable, httpsCallableFromUrl } from '@react-native-firebase/functions';
import { handleNotificationNavigation } from './src/navigation/navigationService';
import { notificationTabEmitter } from './src/navigation/buyer/notificationTabEmitter';
import { StatusBar, View, Text, TouchableOpacity } from 'react-native';
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
import { persistentAuthManager } from './src/utils/persistentAuthManager';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { initRemoteConfig } from './src/services/remoteConfigService';
import { useRemoteConfig } from './src/hooks/useRemoteConfig';
import { LogBox, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { initI18n, LANGUAGE_STORAGE_KEY } from './src/i18n';

const App: React.FC = () => {
    LogBox.ignoreAllLogs(true); // Hide all warnings

    // Initialize i18n once on app start
    initI18n();

    // Apply saved language preference globally on boot
    useEffect(() => {
        (async () => {
            try {
                const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
                if (savedLang && typeof savedLang === 'string') {
                    await i18n.changeLanguage(savedLang);
                }
            } catch (e) {
                console.warn?.('Failed to apply saved language at startup');
            }
        })();
    }, []);

    // const isDark = Appearance.getColorScheme() === 'dark';
    const isDark = false; // Force light mode for now
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [bootstrapState, setBootstrapState] = useState<AuthBootstrapState | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [initializationError, setInitializationError] = useState<string | null>(null);

    // Refs for cleanup tracking
    const isMounted = useRef(true);
    const cleanupFunctions = useRef<Array<() => void>>([]);
    const appStartTime = useRef(Date.now());

    // Performance monitoring
    useEffect(() => {
        if (isBootstrapped && !isInitializing) {
            const initTime = Date.now() - appStartTime.current;
            console.log(`🚀 App fully initialized in ${initTime}ms`);

            // Report to analytics if available
            // analytics.timing('app_initialization', initTime);
        }
    }, [isBootstrapped, isInitializing]);

    // Initialize Remote Config (non-blocking)
    useEffect(() => { (async () => { try { await initRemoteConfig(); } catch { } })(); }, []);
    const rc = useRemoteConfig();

    // Memoize theme colors to prevent unnecessary recalculations
    const themeColors = useMemo(() => ({
        statusBarStyle: isDark ? 'light-content' as const : 'dark-content' as const,
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        textColor: isDark ? Colors.dark.text : Colors.light.text,
        textSecondary: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
    }), [isDark]);

    // Initialize push notifications with error boundary
    const pushNotificationHook = usePushNotifications();
    const {
        isInitialized: isPushInitialized,
        fcmToken,
        permissionStatus,
        requestPermission: requestPushPermission
    } = pushNotificationHook || {};

    // Safe appearance setter with error handling
    const setAppearanceMode = useCallback((mode: 'light' | 'dark') => {
        try {
            Appearance.setColorScheme(mode);
        } catch (error) {
            console.warn('⚠️ Failed to set appearance mode:', error);
        }
    }, []);

    // Set appearance mode based on preference
    useMemo(() => {
        if (!isDark) {
            setAppearanceMode('light');
        } else {
            setAppearanceMode('dark');
        }
    }, [isDark, setAppearanceMode]);

    // Cleanup function to safely remove all listeners
    const cleanup = useCallback(() => {
        if (cleanupFunctions.current) {
            cleanupFunctions.current.forEach(cleanupFn => {
                try {
                    cleanupFn();
                } catch (error) {
                    console.warn('⚠️ Cleanup function failed:', error);
                }
            });
            cleanupFunctions.current = [];
        }
    }, []);

    // Add cleanup function to tracked list
    const addCleanupFunction = useCallback((cleanupFn: () => void) => {
        if (cleanupFunctions.current) {
            cleanupFunctions.current.push(cleanupFn);
        }
    }, []);

    // Component unmount cleanup
    useEffect(() => {
        return () => {
            isMounted.current = false;
            cleanup();
        };
    }, [cleanup]);

    // Initialize network monitoring on app start with comprehensive error handling
    useEffect(() => {
        let isEffectMounted = true;

        const initializeApp = async () => {
            try {
                if (!isMounted.current || !isEffectMounted) return;

                setIsInitializing(true);
                setInitializationError(null);

                // Start all initializations concurrently for better performance
                const initPromises = [];

                // Network monitoring (non-blocking)
                console.log('📶 Initializing network monitoring...');
                initPromises.push(
                    new Promise<void>((resolve) => {
                        try {
                            initializeNetworkMonitoring();
                            console.log('✅ Network monitoring initialized');
                            resolve();
                        } catch (networkError) {
                            console.warn('⚠️ Network monitoring failed to initialize:', networkError);
                            resolve(); // Don't block other initializations
                        }
                    })
                );

                // Initialize persistent auth manager with shorter timeout
                console.log('🔒 Initializing persistent authentication...');
                const authPromise = Promise.race([
                    persistentAuthManager.initialize(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth initialization timeout')), 3000) // Reduced from 10s to 3s
                    )
                ]);
                initPromises.push(authPromise);

                // Initialize notification system (non-blocking)
                console.log('🔔 Initializing notification system...');
                initPromises.push(
                    new Promise<void>((resolve) => {
                        try {
                            const cleanupNotifications = notificationInitService.initialize();
                            if (cleanupNotifications && typeof cleanupNotifications === 'function') {
                                addCleanupFunction(cleanupNotifications);
                            }
                            resolve();
                        } catch (notificationError) {
                            console.warn('⚠️ Notification initialization failed:', notificationError);
                            resolve(); // Don't block app startup
                        }
                    })
                );

                // Wait for critical operations only (auth is critical, others are not)
                await Promise.allSettled(initPromises);

                if (isMounted.current && isEffectMounted) {
                    setIsInitializing(false);
                }
            } catch (error) {
                console.error('❌ App initialization failed:', error);
                if (isMounted.current && isEffectMounted) {
                    setInitializationError(error instanceof Error ? error.message : 'Initialization failed');
                    setIsInitializing(false);
                }
            }
        };

        initializeApp();

        // Return cleanup function
        return () => {
            isEffectMounted = false;
        };
    }, [addCleanupFunction]);

    // Safe splash screen hiding with error handling
    useEffect(() => {
        if (isBootstrapped && !isInitializing) {
            const hideSplash = async () => {
                try {
                    await RNBootSplash.hide({ fade: true });
                    console.log('✅ Splash screen hidden successfully');
                } catch (error) {
                    console.warn('⚠️ Failed to hide splash screen:', error);
                    // Fallback: try hiding without fade
                    try {
                        await RNBootSplash.hide();
                    } catch (fallbackError) {
                        console.error('❌ Complete splash screen failure:', fallbackError);
                    }
                }
            };

            // No delay - hide immediately when ready
            hideSplash();
        }
    }, [isBootstrapped, isInitializing]);

    // Safe notification handling with comprehensive error boundaries
    useEffect(() => {
        let isEffectMounted = true;

        const handleNotificationSafely = (remoteMessage: any, source: string) => {
            try {
                if (!remoteMessage?.data) {
                    console.warn('⚠️ Invalid notification data from', source);
                    return;
                }

                console.log('🔔 Handling notification from', source, remoteMessage.data);
                handleNotificationNavigation(remoteMessage.data, notificationTabEmitter);
            } catch (error) {
                console.error('❌ Notification handling failed from', source, error);
                // Show user-friendly error
                Toast.show({
                    type: 'error',
                    text1: 'Notification Error',
                    text2: 'Unable to open notification content',
                    position: 'bottom',
                    visibilityTime: 3000,
                });
            }
        };

        // Handle foreground and background notifications
        const messagingInstance = getMessaging(getApp());
        const unsubscribeOpenedApp = onNotificationOpenedApp(messagingInstance, (remoteMessage: any) => {
            if (isEffectMounted) {
                handleNotificationSafely(remoteMessage, 'background');
            }
        });

        // Handle quit state notifications
        getInitialNotification(messagingInstance)
            .then((remoteMessage: any) => {
                if (isEffectMounted && remoteMessage) {
                    handleNotificationSafely(remoteMessage, 'quit state');
                }
            })
            .catch(error => {
                console.error('  Failed to get initial notification:', error);
            });

        // Track cleanup functions
        addCleanupFunction(unsubscribeOpenedApp);

        return () => {
            isEffectMounted = false;
            unsubscribeOpenedApp();
        };
    }, [addCleanupFunction]);
    // Safe FCM token handling with validation + backend registration
    const lastRegisteredTokenRef = useRef<string | null>(null);
    useEffect(() => {
        const registerToken = async () => {
            // Ensure authentication/bootstrap is fully completed before attempting registration
            if (!isBootstrapped || !bootstrapState) return;
            if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length === 0) return;

            console.log('🔔 FCM Token received:', fcmToken.substring(0, 20) + '...');

            if (fcmToken.length < 50) {
                console.warn('⚠️ FCM Token seems short, double-check device registration');
            }

            const uid = bootstrapState?.user?.uid || bootstrapState?.user?.id;
            const rawRole = (bootstrapState?.user?.userRole || bootstrapState?.user?.role || '').toString().toLowerCase();
            if (!uid || !rawRole) {
                console.log('⏳ Skipping FCM token registration: user not ready');
                return;
            }

            const sig = `${uid}:${fcmToken}`;
            if (lastRegisteredTokenRef.current === sig) return;

            const role = (rawRole.includes('farmer') || rawRole.includes('seller')) ? 'farmer' : 'buyer';

            // Build callable endpoints explicitly for region (asia-south1)
            // Use modular functions instance (defaults to region defined in backend; we explicitly target a region when building URLs)
            const functionsInstance = getFunctions();
            const projectId = functionsInstance.app?.options?.projectId;
            const region = 'asia-south1';
            const makeCallable = (name: string) => {
                if (projectId) {
                    const url = `https://${region}-${projectId}.cloudfunctions.net/${name}`;
                    // Use modular API for callable functions
                    // Prefer httpsCallableFromURL when available, else fallback to httpsCallable with name (should exist in all modern versions)
                    return httpsCallableFromUrl
                        ? httpsCallableFromUrl(functionsInstance, url)
                        : httpsCallable(functionsInstance, name);
                }
                return httpsCallable(functionsInstance, name);
            };

            try {
                console.log('🌐 Checking existing tokens (region asia-south1)...');
                const getRes: any = await makeCallable('getFcmTokens')({ uid, role });
                const existing = Array.isArray(getRes?.data?.tokens) ? (getRes.data.tokens as string[]) : [];
                console.log('📦 Existing tokens from backend:', existing);
                if (existing.includes(fcmToken)) {
                    lastRegisteredTokenRef.current = sig;
                    console.log('ℹ️ FCM token already registered (no action)');
                    return;
                }

                console.log('📝 Registering new FCM token to backend...');
                await makeCallable('registerFcmToken')({ uid, role, token: fcmToken });
                lastRegisteredTokenRef.current = sig;
                console.log('✅ FCM token registered with backend (asia-south1)');
            } catch (e: any) {
                const msg = e?.message || e?.toString?.() || 'unknown error';
                console.error('❌ Failed (asia-south1) callable:', msg);

                // Fallback: try default region us-central1 in case of region mismatch
                try {
                    console.log('🔁 Fallback attempt in default region (us-central1)...');
                    const defaultGet: any = await httpsCallable(functionsInstance, 'getFcmTokens')({ uid, role });
                    const existing2 = Array.isArray(defaultGet?.data?.tokens) ? defaultGet.data.tokens : [];
                    if (existing2.includes(fcmToken)) {
                        lastRegisteredTokenRef.current = sig;
                        console.log('ℹ️ Token already registered in fallback region');
                        return;
                    }
                    await httpsCallable(functionsInstance, 'registerFcmToken')({ uid, role, token: fcmToken });
                    lastRegisteredTokenRef.current = sig;
                    console.log('✅ Token registered via fallback region (us-central1)');
                } catch (fallbackErr: any) {
                    console.error('❌ Fallback registration failed:', fallbackErr?.message || fallbackErr);
                }
            }
        };

        registerToken();
    }, [isBootstrapped, fcmToken, bootstrapState?.user?.uid, bootstrapState?.user?.userRole]);

    // Enhanced push notification initialization - NON-BLOCKING
    useEffect(() => {
        let isEffectMounted = true;

        const initializePushNotifications = async () => {
            try {
                if (isPushInitialized && isEffectMounted) {
                    console.log('🔔 Push notifications initialized successfully');
                    console.log('🔔 Permission status:', permissionStatus);

                    // Delay permission request to not block splash screen
                    if (permissionStatus === 'unknown' &&
                        typeof requestPushPermission === 'function') {

                        // Request permission after app is fully loaded
                        setTimeout(async () => {
                            if (!isEffectMounted) return;

                            try {
                                const granted = await requestPushPermission();
                                if (isEffectMounted) {
                                    console.log('🔔 Push permission requested:', granted ? 'granted' : 'denied');

                                    if (!granted) {
                                        // Show user-friendly message about notification benefits
                                        Toast.show({
                                            type: 'info',
                                            text1: 'Notifications Disabled',
                                            text2: 'You may miss important updates about your orders',
                                            position: 'bottom',
                                            visibilityTime: 4000,
                                        });
                                    }
                                }
                            } catch (permissionError) {
                                console.error('❌ Permission request failed:', permissionError);
                                if (isEffectMounted) {
                                    Toast.show({
                                        type: 'error',
                                        text1: 'Notification Setup Failed',
                                        text2: 'You can enable notifications later in settings',
                                        position: 'bottom',
                                        visibilityTime: 3000,
                                    });
                                }
                            }
                        }, 1000); // Delay by 1 second after app loads
                    }
                }
            } catch (error) {
                console.error('❌ Push notification initialization error:', error);
            }
        };

        initializePushNotifications();

        return () => {
            isEffectMounted = false;
        };
    }, [isPushInitialized, permissionStatus, requestPushPermission]); // Removed isBootstrapped dependency

    // Safe bootstrap completion handler with validation
    const handleBootstrapComplete = useCallback((state: AuthBootstrapState) => {
        try {
            if (!isMounted.current) return;

            // Validate bootstrap state
            if (!state || typeof state !== 'object') {
                console.error('❌ Invalid bootstrap state received:', state);
                setInitializationError('Invalid authentication state');
                return;
            }

            console.log('🚀 Bootstrap completed:', {
                hasUser: !!state.user,
                userRole: state.user?.userRole || 'unknown',
                timestamp: new Date().toISOString()
            });

            setBootstrapState(state);
            setIsBootstrapped(true);
            setInitializationError(null);
        } catch (error) {
            console.error('❌ Bootstrap completion failed:', error);
            setInitializationError('Authentication setup failed');
        }
    }, []);

    // Error recovery handler
    const handleInitializationRetry = useCallback(() => {
        setInitializationError(null);
        setIsBootstrapped(false);
        setBootstrapState(null);
        setIsInitializing(true);

        // Restart initialization process
        console.log('🔄 Restarting app initialization...');
    }, []);

    // Show initialization error screen
    if (initializationError && !isBootstrapped) {
        return (
            <ErrorBoundary>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <StatusBar
                        barStyle={isDark ? 'light-content' : 'dark-content'}
                        backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
                        translucent
                    />
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: themeColors.backgroundColor,
                        paddingHorizontal: 20
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: themeColors.textColor,
                            marginBottom: 12,
                            textAlign: 'center'
                        }}>
                            Initialization Failed
                        </Text>
                        <Text style={{
                            fontSize: 14,
                            color: themeColors.textSecondary,
                            marginBottom: 24,
                            textAlign: 'center',
                            lineHeight: 20
                        }}>
                            {initializationError}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: Colors.light.primary,
                                paddingHorizontal: 24,
                                paddingVertical: 12,
                                borderRadius: 8
                            }}
                            onPress={handleInitializationRetry}
                        >
                            <Text style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: '600'
                            }}>
                                Try Again
                            </Text>
                        </TouchableOpacity>
                    </View>
                </GestureHandlerRootView>
            </ErrorBoundary>
        );
    }

    // Show bootstrap screen while initializing
    if (!isBootstrapped || !bootstrapState || isInitializing) {
        return (
            <ErrorBoundary>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <StatusBar
                        barStyle={isDark ? 'light-content' : 'dark-content'}
                        backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
                        translucent
                    />
                    <AppBootstrapScreen
                        onBootstrapComplete={handleBootstrapComplete}
                        minimumSplashTime={300} // Reduced from 800ms to 300ms
                    />
                </GestureHandlerRootView>
            </ErrorBoundary>
        );
    }

    // App is bootstrapped, show main navigation
    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{
                flex: 1,
            }} onLayout={() => { }}>
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
        </ErrorBoundary>
    );
};

export default App;