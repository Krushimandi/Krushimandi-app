// File: src/components/WelcomeScreen.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { authFlowManager } from '../../services/authFlowManager';
import { resetToMain } from '../../navigation/navigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { ENABLED_LANGUAGE_CODES, LANGUAGE_STORAGE_KEY } from '../../i18n';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';

// Truecaller Integration - using @ajitpatel28/react-native-truecaller
import {
  useTruecaller,
  TRUECALLER_ANDROID_CUSTOMIZATIONS
} from '@ajitpatel28/react-native-truecaller';
import {
  TRUECALLER_CONFIG,
  shouldFallbackToOTP,
  verifyTruecallerAndSignIn,
} from '../../services/truecallerService';


const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [langReady, setLangReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(''); // For user feedback
  const [truecallerInitialized, setTruecallerInitialized] = useState(false);
  const [truecallerRawData, setTruecallerRawData] = useState(null); // Store raw OAuth credentials
  const [truecallerInProgress, setTruecallerInProgress] = useState(false); // Track Truecaller flow
  const { t } = useTranslation();
  const { setPhoneNumber, setConfirmation } = useAuth();
  const isMountedRef = useRef(true);
  const truecallerProcessingRef = useRef(false);
  const truecallerTimeoutRef = useRef(null);

  // Custom success handler to capture raw OAuth credentials
  // This intercepts the data BEFORE the library exchanges it for a token
  const handleTruecallerRawSuccess = useCallback((rawData) => {
    console.log('📱 Truecaller raw data received (with OAuth credentials)');
    // Clear timeout since we got a response
    if (truecallerTimeoutRef.current) {
      clearTimeout(truecallerTimeoutRef.current);
      truecallerTimeoutRef.current = null;
    }
    if (isMountedRef.current && !truecallerProcessingRef.current) {
      setTruecallerRawData(rawData);
    }
  }, []);

  // Truecaller Integration - @ajitpatel28/react-native-truecaller
  // Use androidSuccessHandler to get raw OAuth credentials for server-side verification
  const {
    initializeTruecallerSDK,
    openTruecallerForVerification,
    isSdkUsable,
    isTruecallerInitialized,
    error: truecallerError,
  } = useTruecaller({
    androidClientId: TRUECALLER_CONFIG.androidClientId,
    iosAppKey: TRUECALLER_CONFIG.iosAppKey,
    iosAppLink: TRUECALLER_CONFIG.iosAppLink,
    androidButtonColor: TRUECALLER_CONFIG.buttonColor,
    androidButtonTextColor: TRUECALLER_CONFIG.buttonTextColor,
    androidButtonShape: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_SHAPES.ROUNDED,
    androidButtonText: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_TEXTS.CONTINUE,
    androidConsentHeading: TRUECALLER_ANDROID_CUSTOMIZATIONS.CONSENT_HEADINGS.LOGIN_SIGNUP_WITH,
    androidFooterButtonText: TRUECALLER_ANDROID_CUSTOMIZATIONS.FOOTER_TEXTS.ANOTHER_MOBILE_NUMBER,
    // Custom handler to capture raw OAuth data before library processes it
    androidSuccessHandler: handleTruecallerRawSuccess,
  });

  // Cleanup ref and timeouts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (truecallerTimeoutRef.current) {
        clearTimeout(truecallerTimeoutRef.current);
      }
    };
  }, []);

  // Block back button during Truecaller authentication
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLoading || truecallerInProgress) {
        return true; // Block back button during auth
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isLoading, truecallerInProgress]);

  // Initialize Truecaller SDK
  useEffect(() => {
    if (langReady && Platform.OS === 'android') {
      console.log('📱 Initializing Truecaller SDK...');
      initializeTruecallerSDK();
    }
  }, [langReady, initializeTruecallerSDK]);

  // Track Truecaller initialization state
  useEffect(() => {
    if (isTruecallerInitialized) {
      setTruecallerInitialized(true);
      console.log('📱 Truecaller SDK initialized, usable:', isSdkUsable());
    }
  }, [isTruecallerInitialized, isSdkUsable]);

  // Handle Truecaller Success - when raw OAuth data is received
  useEffect(() => {
    if (!truecallerRawData || !isMountedRef.current || truecallerProcessingRef.current) return;

    truecallerProcessingRef.current = true;
    console.log('✅ Truecaller Success - Raw OAuth data received');

    const handleTruecallerAuth = async () => {
      try {
        setIsLoading(true);
        setLoadingMessage('Verifying...');

        // Validate required OAuth credentials
        if (!truecallerRawData.authorizationCode || !truecallerRawData.codeVerifier) {
          console.error('❌ Missing OAuth credentials from Truecaller');
          throw new Error('Missing OAuth credentials from Truecaller');
        }

        // SECURE FLOW: Only send OAuth credentials to server
        setLoadingMessage('Authenticating...');
        console.log('🔐 Sending OAuth credentials to Cloud Function...');

        const result = await verifyTruecallerAndSignIn({
          authorizationCode: truecallerRawData.authorizationCode,
          codeVerifier: truecallerRawData.codeVerifier,
        });

        if (!result.success) {
          console.error('❌ Truecaller Cloud Function verification failed:', result.error);
          throw new Error(result.error || 'Verification failed');
        }

        // Phone number comes back from server (from Truecaller API)
        if (result.phoneNumber) {
          console.log('📱 Phone number from server:', result.phoneNumber);
          setPhoneNumber(result.phoneNumber);
        }

        console.log('✅ Truecaller authentication successful!');
        setLoadingMessage('Success!');
        // Navigate immediately - no delay needed
        if (!isMountedRef.current) return;

        if (result.route === 'Main') {
          resetToMain();
        } else if (result.route === 'RoleSelection') {
          // Pass Truecaller profile data for quick onboarding
          navigation.replace(result.route, {
            truecallerProfile: result.truecallerProfile,
            phoneNumber: result.phoneNumber,
            fromTruecaller: true,
          });
        } else {
          if (result.params) {
            navigation.replace(result.route, result.params);
          } else {
            navigation.replace(result.route);
          }
        }

      } catch (error) {
        console.error('❌ Truecaller auth error:', error);

        if (isMountedRef.current) {
          setIsLoading(false);
          setTruecallerInProgress(false);
          setLoadingMessage('');
          truecallerProcessingRef.current = false;
          // Navigate to MobileScreen for fallback
          navigation.navigate('MobileScreen');
        }
      }
    };

    handleTruecallerAuth();
  }, [truecallerRawData, navigation, setPhoneNumber]);

  // Handle Truecaller Error/Cancel - user explicitly rejected or Truecaller not available
  useEffect(() => {
    if (!truecallerError || !isMountedRef.current) return;

    // Clear timeout since we got a response (even if error)
    if (truecallerTimeoutRef.current) {
      clearTimeout(truecallerTimeoutRef.current);
      truecallerTimeoutRef.current = null;
    }

    console.log('❌ Truecaller Error:', truecallerError);

    // Reset state (loading was never set, just truecallerInProgress)
    setTruecallerInProgress(false);
    truecallerProcessingRef.current = false;

    // User explicitly chose another number or rejected - go to MobileScreen
    navigation.navigate('MobileScreen');
  }, [truecallerError, navigation]);

  // 1) Detect and apply language BEFORE anything renders
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const locales = RNLocalize.getLocales();
        const device = (locales?.[0]?.languageCode || 'en').toLowerCase();
        const supported = (ENABLED_LANGUAGE_CODES.includes(saved) ? saved
          : (ENABLED_LANGUAGE_CODES.includes(device) ? device : 'en'));
        if (supported && i18n.language !== supported) {
          await i18n.changeLanguage(supported);
        }
      } catch (e) {
        // fall back to default 'en' via i18n config
      } finally {
        if (mounted) setLangReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2) After language is ready, proceed with auth flow check and navigation
  useEffect(() => {
    if (!langReady) return;
    const checkAuthAndNavigate = async () => {
      try {
        // Get the next route from auth flow manager
        const route = await authFlowManager.resumeAuthFlow();

        console.log('🔍 WelcomeScreen - Auth flow route:', route);

        // If user should be elsewhere, navigate (but not to MobileScreen)
        if (route.screen !== 'Welcome' && route.screen !== 'MobileScreen') {
          if (route.screen === 'Main') {
            console.log('✅ Auth complete, navigating to Main');
            resetToMain();
          } else if (route.screen !== 'MobileScreen') {
            console.log(`📱 Navigating to ${route.screen}`);
            if (route.params) {
              navigation.replace(route.screen, route.params);
            } else {
              navigation.replace(route.screen);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in WelcomeScreen auth check:', error);
        // Stay on welcome screen on error
      }
    };

    checkAuthAndNavigate();
  }, [navigation, langReady]);

  const handleGetStarted = async () => {
    console.log('Get Started pressed');

    // Try Truecaller on Android if SDK is initialized and usable
    if (Platform.OS === 'android' && truecallerInitialized) {
      try {
        const isUsable = isSdkUsable();
        console.log('📱 Truecaller SDK usable:', isUsable);

        if (isUsable) {
          // Mark Truecaller in progress but don't show loading on button
          // (Truecaller dialog will overlay, our button shouldn't show "Opening...")
          setTruecallerInProgress(true);
          console.log('📱 Opening Truecaller for verification...');

          await openTruecallerForVerification();

          // Set a longer timeout (15 seconds) - user should respond by then
          // This timeout will be cleared when Truecaller responds (success or error)
          truecallerTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !truecallerProcessingRef.current && truecallerInProgress) {
              console.log('📱 Truecaller timeout - user may have dismissed without action');
              setTruecallerInProgress(false);
              // Stay on WelcomeScreen - user can try again or use manual entry
              Toast.show({
                type: 'info',
                text1: 'Truecaller timed out',
                text2: 'Tap "Get Started" to try again',
                position: 'bottom',
                visibilityTime: 2000,
              });
            }
          }, 15000);

          return; // Wait for Truecaller callback
        }
      } catch (e) {
        console.warn('Truecaller verification failed:', e);
        setTruecallerInProgress(false);
      }
    }

    // Fallback to manual phone entry if Truecaller not available
    navigation.navigate('MobileScreen');
  };

  const insets = useSafeAreaInsets();

  if (!langReady) {
    // Prevent the screen from flashing in the wrong language
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image */}
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Overlay */}
        <View style={styles.overlay} />
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.textContainer}>
              <Text style={styles.welcomeText}>{t('auth.welcome.welcomeTo')}</Text>
              <Text style={styles.titleText}>KrushiMandi</Text>

              <Text style={styles.descriptionText}>
                {t('auth.welcome.description')}
              </Text>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={[styles.bottomSection, { paddingBottom: insets.bottom * 0.8 }]}>
            <TouchableOpacity
              style={[styles.getStartedButton, isLoading && styles.getStartedButtonLoading]}
              onPress={handleGetStarted}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  {loadingMessage ? (
                    <Text style={styles.loadingText}>{loadingMessage}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.getStartedText}>{t('auth.welcome.getStarted')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 50,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 34,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    lineHeight: 38,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 0,
  },
  bottomSection: {
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: '#7ED321',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButtonLoading: {
    opacity: 0.8,
  },
  getStartedText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});

export default WelcomeScreen;
