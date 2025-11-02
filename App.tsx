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
import { KeyboardProvider } from 'react-native-keyboard-controller';
import RNBootSplash from 'react-native-bootsplash';
import { AppNavigator } from './src/navigation';
import { Colors } from './src/constants';
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
import { LogBox, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { initI18n, LANGUAGE_STORAGE_KEY } from './src/i18n';

const App: React.FC = () => {
    LogBox.ignoreAllLogs(true); // Hide all warnings

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

    // Initialize i18n and Remote Config asynchronously (non-blocking)
    useEffect(() => {
        const initializeNonCritical = async () => {
            try {
                // Initialize i18n
                initI18n();

                // Apply saved language preference
                const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
                if (savedLang && typeof savedLang === 'string') {
                    await i18n.changeLanguage(savedLang);
                }

                // Initialize Remote Config (after i18n)
                await initRemoteConfig();
            } catch (e) {
                console.warn?.('Non-critical initialization failed:', e);
            }
        };

        // Run in background, don't block bootstrap
        initializeNonCritical();
    }, []);

    // Performance monitoring (deferred to not block render)
    useEffect(() => {
        if (isBootstrapped && !isInitializing) {
            // Defer to next tick to not block UI
            setTimeout(() => {
                const initTime = Date.now() - appStartTime.current;
                console.log(`🚀 App fully initialized in ${initTime}ms`);
            }, 0);
        }
    }, [isBootstrapped, isInitializing]);

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

    // Set appearance mode once on mount
    useEffect(() => {
        try {
            Appearance.setColorScheme(isDark ? 'dark' : 'light');
        } catch (error) {
            console.warn('⚠️ Failed to set appearance mode:', error);
        }
    }, []); // Only run once on mount since isDark is constant

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
                initPromises.push(
                    new Promise<void>((resolve) => {
                        try {
                            initializeNetworkMonitoring();
                            resolve();
                        } catch (networkError) {
                            console.warn('⚠️ Network monitoring failed:', networkError);
                            resolve(); // Don't block other initializations
                        }
                    })
                );

                // Initialize persistent auth manager with shorter timeout
                const authPromise = Promise.race([
                    persistentAuthManager.initialize(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth initialization timeout')), 3000)
                    )
                ]);
                initPromises.push(authPromise);

                // Initialize notification system (non-blocking)
                initPromises.push(
                    new Promise<void>((resolve) => {
                        try {
                            const cleanupNotifications = notificationInitService.initialize();
                            if (cleanupNotifications && typeof cleanupNotifications === 'function') {
                                addCleanupFunction(cleanupNotifications);
                            }
                            resolve();
                        } catch (notificationError) {
                            console.warn('⚠️ Notification init failed:', notificationError);
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
            // Hide splash immediately when ready
            RNBootSplash.hide({ fade: true }).catch(error => {
                console.warn('⚠️ Splash screen error:', error);
                // Fallback: try hiding without fade
                RNBootSplash.hide().catch(() => { });
            });
        }
    }, [isBootstrapped, isInitializing]);

    // Safe notification handling with comprehensive error boundaries
    useEffect(() => {
        let isEffectMounted = true;

        const handleNotificationSafely = (remoteMessage: any, source: string) => {
            try {
                if (!remoteMessage?.data) {
                    console.warn('⚠️ Invalid notification data');
                    return;
                }
                handleNotificationNavigation(remoteMessage.data, notificationTabEmitter);
            } catch (error) {
                console.error('❌ Notification handling failed:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Notification Error',
                    text2: 'Unable to open notification content',
                    position: 'bottom',
                    visibilityTime: 1000,
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
    const tokenRegistrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const registerToken = async () => {
            // Ensure authentication/bootstrap is fully completed before attempting registration
            if (!isBootstrapped || !bootstrapState) return;
            if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length === 0) return;

            const uid = bootstrapState?.user?.uid || bootstrapState?.user?.id;
            const rawRole = (bootstrapState?.user?.userRole || bootstrapState?.user?.role || '').toString().toLowerCase();
            if (!uid || !rawRole) return;

            const sig = `${uid}:${fcmToken}`;
            if (lastRegisteredTokenRef.current === sig) return;

            const role = (rawRole.includes('farmer') || rawRole.includes('seller')) ? 'farmer' : 'buyer';

            // Build callable endpoints explicitly for region (asia-south1)
            const functionsInstance = getFunctions();
            const projectId = functionsInstance.app?.options?.projectId;
            const region = 'asia-south1';
            const makeCallable = (name: string) => {
                if (projectId) {
                    const url = `https://${region}-${projectId}.cloudfunctions.net/${name}`;
                    return httpsCallableFromUrl
                        ? httpsCallableFromUrl(functionsInstance, url)
                        : httpsCallable(functionsInstance, name);
                }
                return httpsCallable(functionsInstance, name);
            };

            try {
                const getRes: any = await makeCallable('getFcmTokens')({ uid, role });
                const existing = Array.isArray(getRes?.data?.tokens) ? (getRes.data.tokens as string[]) : [];

                if (existing.includes(fcmToken)) {
                    lastRegisteredTokenRef.current = sig;
                    return;
                }

                await makeCallable('registerFcmToken')({ uid, role, token: fcmToken });
                lastRegisteredTokenRef.current = sig;
            } catch (e: any) {
                // Fallback: try default region us-central1 in case of region mismatch
                try {
                    const defaultGet: any = await httpsCallable(functionsInstance, 'getFcmTokens')({ uid, role });
                    const existing2 = Array.isArray(defaultGet?.data?.tokens) ? defaultGet.data.tokens : [];
                    if (existing2.includes(fcmToken)) {
                        lastRegisteredTokenRef.current = sig;
                        return;
                    }
                    await httpsCallable(functionsInstance, 'registerFcmToken')({ uid, role, token: fcmToken });
                    lastRegisteredTokenRef.current = sig;
                } catch (fallbackErr: any) {
                    console.error('❌ Token registration failed:', fallbackErr?.message || fallbackErr);
                }
            }
        };

        // Debounce token registration to avoid rapid re-registrations
        if (tokenRegistrationTimeoutRef.current) {
            clearTimeout(tokenRegistrationTimeoutRef.current);
        }

        tokenRegistrationTimeoutRef.current = setTimeout(() => {
            registerToken();
        }, 500); // Debounce by 500ms

        return () => {
            if (tokenRegistrationTimeoutRef.current) {
                clearTimeout(tokenRegistrationTimeoutRef.current);
            }
        };
    }, [isBootstrapped, fcmToken, bootstrapState?.user?.uid, bootstrapState?.user?.userRole]);

    // Enhanced push notification initialization - NON-BLOCKING
    useEffect(() => {
        let isEffectMounted = true;

        const initializePushNotifications = async () => {
            try {
                if (isPushInitialized && isEffectMounted) {
                    // Delay permission request to not block splash screen
                    if (permissionStatus === 'unknown' && typeof requestPushPermission === 'function') {

                        // Request permission after app is fully loaded
                        setTimeout(async () => {
                            if (!isEffectMounted) return;

                            try {
                                const granted = await requestPushPermission();
                                if (isEffectMounted && !granted) {
                                    // Show user-friendly message about notification benefits
                                    Toast.show({
                                        type: 'info',
                                        text1: 'Notifications Disabled',
                                        text2: 'You may miss important updates about your orders',
                                        position: 'bottom',
                                        visibilityTime: 1000,
                                    });
                                }
                            } catch (permissionError) {
                                console.error('❌ Permission request failed:', permissionError);
                            }
                        }, 500);
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
                console.error('❌ Invalid bootstrap state');
                setInitializationError('Invalid authentication state');
                return;
            }

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
                        minimumSplashTime={0}
                    />
                </GestureHandlerRootView>
            </ErrorBoundary>
        );
    }

    // App is bootstrapped, show main navigation
    return (
        <ErrorBoundary>
            <KeyboardProvider>
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
            </KeyboardProvider>
        </ErrorBoundary>
    );
};

export default App;