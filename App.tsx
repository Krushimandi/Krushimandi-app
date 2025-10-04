/**
 * KrushiMandi App - Production-Ready with Advanced Error Handling & Performance
 * @version 2.0.0
 * @author Rushikesh-Satpute
 * @date 2025-01-04
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getApp } from '@react-native-firebase/app';
import {
    getMessaging,
    onNotificationOpenedApp,
    getInitialNotification,
} from '@react-native-firebase/messaging';
import { handleNotificationNavigation } from './src/navigation/navigationService';
import { notificationTabEmitter } from './src/navigation/buyer/notificationTabEmitter';
import {
    StatusBar,
    View,
    Text,
    TouchableOpacity,
    AppState as RNAppState,
    AppStateStatus
} from 'react-native';
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

// ==================== CONSTANTS ====================
const INIT_TIMEOUT = 5000; // 5 seconds max for critical init
const SPLASH_MIN_DURATION = 1000; // Minimum splash screen time
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Development mode detection
const __DEV__ = process.env.NODE_ENV === 'development';

// ==================== TYPES ====================
interface AppInitState {  // ✅ Renamed from AppState to AppInitState
    isBootstrapped: boolean;
    bootstrapState: AuthBootstrapState | null;
    isInitializing: boolean;
    initializationError: string | null;
    retryCount: number;
}

interface InitializationResult {
    success: boolean;
    error?: Error;
    duration: number;
}

// ==================== MAIN COMPONENT ====================
const App: React.FC = () => {
    // ==================== CONFIGURATION ====================
    if (!__DEV__) {
        LogBox.ignoreAllLogs(true);
    }

    // ==================== STATE MANAGEMENT ====================
    const [appState, setAppState] = useState<AppInitState>({  // ✅ Updated type
        isBootstrapped: false,
        bootstrapState: null,
        isInitializing: true,
        initializationError: null,
        retryCount: 0,
    });

    const isDark = false; // Force light mode (can be made dynamic later)

    // ==================== REFS ====================
    const isMounted = useRef(true);
    const cleanupFunctions = useRef<Map<string, () => void>>(new Map());
    const appStartTime = useRef(Date.now());
    const initializationAttempts = useRef(0);
    const appStateRef = useRef<AppStateStatus>(RNAppState.currentState);  // ✅ Updated
    const splashHidden = useRef(false);

    // ==================== MEMOIZED VALUES ====================
    const themeColors = useMemo(() => ({
        statusBarStyle: isDark ? ('light-content' as const) : ('dark-content' as const),
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        textColor: isDark ? Colors.dark.text : Colors.light.text,
        textSecondary: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
    }), [isDark]);

    // ==================== HOOKS ====================
    const pushNotificationHook = usePushNotifications();
    const {
        isInitialized: isPushInitialized,
        fcmToken,
        permissionStatus,
        requestPermission: requestPushPermission,
    } = pushNotificationHook || {};

    const remoteConfig = useRemoteConfig();

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Safely updates app state with validation
     */
    const updateAppState = useCallback((updates: Partial<AppInitState>) => {  // ✅ Updated type
        if (isMounted.current) {
            setAppState(prev => ({ ...prev, ...updates }));
        }
    }, []);

    /**
     * Adds a cleanup function with unique identifier
     */
    const addCleanupFunction = useCallback((id: string, cleanupFn: () => void) => {
        if (cleanupFunctions.current) {
            cleanupFunctions.current.set(id, cleanupFn);
        }
    }, []);

    /**
     * Removes a specific cleanup function
     */
    const removeCleanupFunction = useCallback((id: string) => {
        if (cleanupFunctions.current) {
            cleanupFunctions.current.delete(id);
        }
    }, []);

    /**
     * Executes all cleanup functions safely
     */
    const cleanup = useCallback(() => {
        if (cleanupFunctions.current) {
            cleanupFunctions.current.forEach((cleanupFn, id) => {
                try {
                    cleanupFn();
                    if (__DEV__) console.log(`✅ Cleanup executed: ${id}`);
                } catch (error) {
                    console.error(`❌ Cleanup failed for ${id}:`, error);
                }
            });
            cleanupFunctions.current.clear();
        }
    }, []);

    /**
     * Sets appearance mode with error handling
     */
    const setAppearanceMode = useCallback((mode: 'light' | 'dark') => {
        try {
            Appearance.setColorScheme(mode);
        } catch (error) {
            console.warn('⚠️ Failed to set appearance mode:', error);
        }
    }, []);

    /**
     * Safely hides splash screen with fallback
     */
    const hideSplashScreen = useCallback(async () => {
        if (splashHidden.current) return;

        try {
            const initDuration = Date.now() - appStartTime.current;
            const remainingTime = Math.max(0, SPLASH_MIN_DURATION - initDuration);

            // Ensure minimum splash duration for better UX
            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }

            await RNBootSplash.hide({ fade: true });
            splashHidden.current = true;
            if (__DEV__) console.log('✅ Splash screen hidden successfully');
        } catch (error) {
            console.warn('⚠️ Failed to hide splash screen with fade:', error);

            // Fallback: hide without animation
            try {
                await RNBootSplash.hide();
                splashHidden.current = true;
            } catch (fallbackError) {
                console.error('❌ Complete splash screen failure:', fallbackError);
                splashHidden.current = true; // Mark as hidden to prevent infinite retries
            }
        }
    }, []);

    /**
     * Handles notification with comprehensive error handling
     */
    const handleNotificationSafely = useCallback((remoteMessage: any, source: string) => {
        try {
            if (!remoteMessage?.data) {
                if (__DEV__) console.warn(`⚠️ Invalid notification data from ${source}`);
                return;
            }

            if (__DEV__) console.log(`🔔 Handling notification from ${source}:`, remoteMessage.data);
            handleNotificationNavigation(remoteMessage.data, notificationTabEmitter);
        } catch (error) {
            console.error(`❌ Notification handling failed from ${source}:`, error);

            Toast.show({
                type: 'error',
                text1: 'Notification Error',
                text2: 'Unable to open notification content',
                position: 'bottom',
                visibilityTime: 3000,
            });
        }
    }, []);

    /**
     * Initializes i18n with saved language preference
     */
    const initializeI18n = useCallback(async (): Promise<InitializationResult> => {
        const startTime = Date.now();
        try {
            initI18n();

            const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (savedLang && typeof savedLang === 'string') {
                await i18n.changeLanguage(savedLang);
            }

            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            console.warn('⚠️ Failed to initialize i18n:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('i18n initialization failed'),
                duration: Date.now() - startTime,
            };
        }
    }, []);

    /**
     * Initializes network monitoring
     */
    const initializeNetwork = useCallback(async (): Promise<InitializationResult> => {
        const startTime = Date.now();
        try {
            await initializeNetworkMonitoring();
            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            console.warn('⚠️ Network monitoring failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Network init failed'),
                duration: Date.now() - startTime,
            };
        }
    }, []);

    /**
     * Initializes authentication
     */
    const initializeAuth = useCallback(async (): Promise<InitializationResult> => {
        const startTime = Date.now();
        try {
            await Promise.race([
                persistentAuthManager.initialize(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), INIT_TIMEOUT)
                ),
            ]);

            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            console.error('❌ Auth initialization failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Auth init failed'),
                duration: Date.now() - startTime,
            };
        }
    }, []);

    /**
     * Initializes notifications
     */
    const initializeNotifications = useCallback(async (): Promise<InitializationResult> => {
        const startTime = Date.now();
        try {
            const cleanupNotifications = await notificationInitService.initialize();

            if (cleanupNotifications && typeof cleanupNotifications === 'function') {
                addCleanupFunction('notifications', cleanupNotifications);
            }

            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            console.warn('⚠️ Notification initialization failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Notification init failed'),
                duration: Date.now() - startTime,
            };
        }
    }, [addCleanupFunction]);

    /**
     * Initializes remote config
     */
    const initializeRemoteConfig = useCallback(async (): Promise<InitializationResult> => {
        const startTime = Date.now();
        try {
            await initRemoteConfig();
            return {
                success: true,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            console.warn('⚠️ Remote config initialization failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Remote config init failed'),
                duration: Date.now() - startTime,
            };
        }
    }, []);

    /**
     * Main initialization orchestrator with retry logic
     */
    const initializeApp = useCallback(async () => {
        if (initializationAttempts.current >= MAX_RETRY_ATTEMPTS) {
            updateAppState({
                initializationError: 'Maximum retry attempts reached',
                isInitializing: false,
            });
            return;
        }

        initializationAttempts.current++;

        try {
            if (!isMounted.current) return;

            updateAppState({
                isInitializing: true,
                initializationError: null,
            });

            if (__DEV__) console.log(`🚀 Starting app initialization (attempt ${initializationAttempts.current})...`);

            // Critical initializations (sequential)
            const criticalInits = [
                { name: 'i18n', fn: initializeI18n },
                { name: 'auth', fn: initializeAuth },
            ];

            // Non-critical initializations (parallel)
            const nonCriticalInits = [
                { name: 'network', fn: initializeNetwork },
                { name: 'notifications', fn: initializeNotifications },
                { name: 'remoteConfig', fn: initializeRemoteConfig },
            ];

            // Run critical inits sequentially
            for (const init of criticalInits) {
                const result = await init.fn();
                if (__DEV__) {
                    console.log(`${result.success ? '✅' : '⚠️'} ${init.name} initialized in ${result.duration}ms`);
                }

                if (!result.success && init.name === 'auth') {
                    throw result.error || new Error(`${init.name} initialization failed`);
                }
            }

            // Run non-critical inits in parallel
            const nonCriticalResults = await Promise.allSettled(
                nonCriticalInits.map(init => init.fn())
            );

            nonCriticalResults.forEach((result, index) => {
                const initName = nonCriticalInits[index].name;
                if (result.status === 'fulfilled' && __DEV__) {
                    console.log(`${result.value.success ? '✅' : '⚠️'} ${initName} initialized in ${result.value.duration}ms`);
                }
            });

            const totalDuration = Date.now() - appStartTime.current;
            if (__DEV__) console.log(`🎉 App initialization completed in ${totalDuration}ms`);

            if (isMounted.current) {
                updateAppState({
                    isInitializing: false,
                    initializationError: null,
                });
            }

        } catch (error) {
            console.error('❌ App initialization failed:', error);

            const errorMessage = error instanceof Error ? error.message : 'Initialization failed';

            if (isMounted.current) {
                updateAppState({
                    initializationError: errorMessage,
                    isInitializing: false,
                    retryCount: initializationAttempts.current,
                });
            }

            // Auto-retry with exponential backoff
            if (initializationAttempts.current < MAX_RETRY_ATTEMPTS) {
                const retryDelay = RETRY_DELAY * Math.pow(2, initializationAttempts.current - 1);
                if (__DEV__) console.log(`🔄 Retrying initialization in ${retryDelay}ms...`);

                setTimeout(() => {
                    if (isMounted.current) {
                        initializeApp();
                    }
                }, retryDelay);
            }
        }
    }, [
        updateAppState,
        initializeI18n,
        initializeAuth,
        initializeNetwork,
        initializeNotifications,
        initializeRemoteConfig,
    ]);

    /**
     * Retry initialization manually
     */
    const retryInitialization = useCallback(() => {
        initializationAttempts.current = 0;
        initializeApp();
    }, [initializeApp]);

    // ==================== EFFECTS ====================

    /**
     * Component mount/unmount lifecycle
     */
    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
            cleanup();
        };
    }, [cleanup]);

    /**
     * Set appearance mode
     */
    useEffect(() => {
        setAppearanceMode(isDark ? 'dark' : 'light');
    }, [isDark, setAppearanceMode]);

    /**
     * Initialize app on mount
     */
    useEffect(() => {
        initializeApp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ✅ Empty deps - only run once on mount

    /**
     * Hide splash screen when ready
     */
    useEffect(() => {
        if (appState.isBootstrapped && !appState.isInitializing) {
            hideSplashScreen();
        }
    }, [appState.isBootstrapped, appState.isInitializing, hideSplashScreen]);

    /**
     * Setup notification handlers
     */
    useEffect(() => {
        let isEffectMounted = true;

        try {
            const messagingInstance = getMessaging(getApp());

            // Handle background/foreground notifications
            const unsubscribeOpenedApp = onNotificationOpenedApp(
                messagingInstance,
                (remoteMessage: any) => {
                    if (isEffectMounted && isMounted.current) {
                        handleNotificationSafely(remoteMessage, 'background');
                    }
                }
            );

            addCleanupFunction('notificationOpenedApp', unsubscribeOpenedApp);

            // Handle quit state notifications
            getInitialNotification(messagingInstance)
                .then((remoteMessage: any) => {
                    if (isEffectMounted && isMounted.current && remoteMessage) {
                        handleNotificationSafely(remoteMessage, 'quit state');
                    }
                })
                .catch((error) => {
                    console.error('❌ Failed to get initial notification:', error);
                });

        } catch (error) {
            console.error('❌ Failed to setup notification handlers:', error);
        }

        return () => {
            isEffectMounted = false;
            removeCleanupFunction('notificationOpenedApp');
        };
    }, [handleNotificationSafely, addCleanupFunction, removeCleanupFunction]);

    /**
     * App state change handler (background/foreground)
     */
    useEffect(() => {
        const subscription = RNAppState.addEventListener('change', (nextAppState: AppStateStatus) => {  // ✅ Updated
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                if (__DEV__) console.log('📱 App has come to foreground');
                // Refresh critical data if needed
            } else if (nextAppState.match(/inactive|background/)) {
                if (__DEV__) console.log('📱 App has gone to background');
                // Cleanup or pause operations if needed
            }

            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    /**
     * Performance monitoring
     */
    useEffect(() => {
        if (appState.isBootstrapped && !appState.isInitializing) {
            const totalTime = Date.now() - appStartTime.current;

            if (__DEV__) {
                console.log(`📊 Performance Metrics:`);
                console.log(`   Total initialization: ${totalTime}ms`);
                console.log(`   Retry attempts: ${initializationAttempts.current}`);
            }

            // Report to analytics service
            // analytics().logEvent('app_startup_complete', { duration: totalTime });
        }
    }, [appState.isBootstrapped, appState.isInitializing]);

    // ==================== ERROR UI ====================
    if (appState.initializationError && appState.retryCount >= MAX_RETRY_ATTEMPTS) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: themeColors.backgroundColor }}>
                <Text style={{ fontSize: 24, marginBottom: 10, color: themeColors.textColor }}>
                    ⚠️ Initialization Failed
                </Text>
                <Text style={{ fontSize: 16, marginBottom: 20, color: themeColors.textSecondary, textAlign: 'center' }}>
                    {appState.initializationError}
                </Text>
                <TouchableOpacity
                    onPress={retryInitialization}
                    style={{
                        backgroundColor: Colors.light.primary,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        Retry
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ==================== RENDER ====================
    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar
                    barStyle={themeColors.statusBarStyle}
                    backgroundColor={themeColors.backgroundColor}
                />

                {appState.isBootstrapped && appState.bootstrapState ? (
                    <AuthStateProvider bootstrapState={appState.bootstrapState}>
                        <NetworkStatusIndicator />
                        <AppNavigator />
                        <Toast />
                    </AuthStateProvider>
                ) : (
                    <AppBootstrapScreen
                        onBootstrapComplete={(state) => {
                            if (isMounted.current) {
                                updateAppState({
                                    isBootstrapped: true,
                                    bootstrapState: state,
                                });
                            }
                        }}
                    />
                )}
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
};

export default App;