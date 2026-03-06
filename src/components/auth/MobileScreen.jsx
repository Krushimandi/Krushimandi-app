import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import ReAnimated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authFlowManager } from 'services/authFlowManager';

const MobileScreen = ({ navigation }) => {
  const { setPhoneNumber, setConfirmation } = useAuth();
  const { t } = useTranslation();
  const [mobile, setMobile] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard event listeners for better scroll handling
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      if (__DEV__) console.log('Keyboard shown');
      // Scroll to the input field when keyboard appears
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 250,
          animated: true,
        });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (__DEV__) console.log('Keyboard hidden');
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    Keyboard.dismiss();
  }, [showHelpModal]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(number);
  };

  // Keyboard height as shared value for reanimated
  const keyboardHeightAnimated = useSharedValue(0);

  // Keyboard handler
  useKeyboardHandler({
    onStart: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
    onMove: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
    onEnd: (e) => {
      'worklet';
      keyboardHeightAnimated.value = e.height;
    },
  });

  // Animated style for the fake view at bottom
  const fakeViewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      height: withTiming(keyboardHeightAnimated.value, { duration: 10 }),
    };
  });

  const handleMobileChange = useCallback((text) => {
    // Remove any non-digit characters
    const cleanedText = text.replace(/[^0-9]/g, '');
    setMobile(cleanedText);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  }, [error]);

  const handleInputFocus = useCallback(() => {
    if (__DEV__) console.log('Input focused');
    // setIsFocused(true);

    // Scroll to input field when keyboard opens
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 200, // Adjust this value based on your layout
        animated: true,
      });
    }, 300);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (__DEV__) console.log('Input blurred');
    setIsFocused(false);
  }, []);


  const insets = useSafeAreaInsets();
  const isButtonDisabled = useMemo(() => mobile.length < 10 || isLoading, [mobile.length, isLoading]);

  const inputWrapperStyle = useMemo(() => [
    styles.inputWrapper,
    isFocused && styles.inputWrapperFocused,
    error && styles.inputWrapperError
  ], [isFocused, error]);

  // Map Firebase Auth errors to simple, user-friendly messages
  const getFriendlyErrorMessage = useCallback((err) => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/network-request-failed':
        return t('auth.mobile.errors.network');
      case 'auth/too-many-requests':
        return t('auth.mobile.errors.tooMany');
      case 'auth/invalid-phone-number':
        return t('auth.mobile.errors.invalidPhone');
      case 'auth/quota-exceeded':
        return t('auth.mobile.errors.quota');
      case 'auth/missing-phone-number':
        return t('auth.mobile.errors.missingPhone');
      case 'auth/operation-not-allowed':
      case 'auth/app-not-authorized':
        return t('auth.mobile.errors.notAllowed');
      case 'auth/invalid-verification-code':
        return t('auth.mobile.errors.invalidCode');
      case 'auth/invalid-verification-id':
        return t('auth.mobile.errors.invalidId');
      default: {
        // Fallback: keep it simple, avoid exposing raw error details to users
        return t('auth.mobile.errors.generic');
      }
    }
  }, []);

  const handleNext = async () => {
    if (isLoading) return; // prevent duplicate submissions
    if (!mobile.trim()) {
      setError(t('auth.mobile.errors.empty'));
      return;
    }

    if (!validatePhoneNumber(mobile)) {
      setError(t('auth.mobile.errors.invalid'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // // Send OTP using Firebase
      // const tokenResult = await appCheck().getToken();
      // console.log('App Check token:', tokenResult.token);

      const phoneNumberWithCode = `+91${mobile}`;
      const confirmation = await auth().signInWithPhoneNumber(phoneNumberWithCode);

      // Store phone number and confirmation in context
      setPhoneNumber(phoneNumberWithCode);
      setConfirmation(confirmation);

      // Navigate without passing confirmation
      navigation.navigate('OTPVerification', { phoneNumber: phoneNumberWithCode });
    } catch (err) {
      if (__DEV__) console.log('send OTP error:', err);
      if (isMountedRef.current) setError(getFriendlyErrorMessage(err));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Welcome');
  };

  const showHelp = () => {
    setShowHelpModal(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeHelpModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowHelpModal(false);
    });
  };
  // Handle dismissing keyboard only when tapping outside input area
  const handleOutsidePress = () => {
    if (isFocused) {
      Keyboard.dismiss();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF" />
      <View style={styles.innerContainer}>
        {/* Header */}
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        >
          {/* Logo with animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Image
              source={require('../../assets/images/logo1.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Content with animation */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.heading}>{t('auth.mobile.title')}</Text>
            <Text style={styles.subtext}>{t('auth.mobile.subtitle')}</Text>

            {/* Enhanced Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('auth.mobile.label')}</Text>
              <View style={inputWrapperStyle}>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeContainer}>
                    <Image
                      source={require('../../assets/icons/in.png')}
                      style={styles.flagIcon}
                    />
                    <Text style={styles.countryCode}>+91</Text>
                  </View>
                  <View style={styles.separator} />

                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => inputRef.current?.focus()}>
                    <TextInput
                      ref={inputRef}
                      placeholder={t('auth.mobile.placeholder')}
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.input}
                      placeholderTextColor="#999"
                      value={mobile}
                      onChangeText={handleMobileChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      autoFocus={false}
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                      editable={!isLoading}
                    />
                  </Pressable>

                  {mobile.length >= 10 && (
                    <Ionicons name="checkmark-circle" size={20} color="#00C851" />
                  )}
                </View>
              </View>

              {/* Error message */}
              {error ? (
                <Animated.View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3547" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Character count */}
              <Text style={styles.characterCount}>
                {mobile.length}/10 {t('auth.mobile.digits')}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Enhanced Next Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              isButtonDisabled && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={isButtonDisabled}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.nextText}>{t('auth.mobile.continue')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fake animated view at bottom to push content up when keyboard opens */}
      <ReAnimated.View style={fakeViewAnimatedStyle} />

      {/* Help Modal */}
      {showHelpModal && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeHelpModal}>
            <View style={styles.modalBackground} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.helpModal,
              {
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.helpIconContainer}>
                <Ionicons name="help-circle" size={28} color="#007E2F" />
              </View>
              <Text style={styles.modalTitle}>{t('auth.mobile.help.title')}</Text>
              <TouchableOpacity onPress={closeHelpModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>{t('auth.mobile.help.tipsTitle')}</Text>

              <View style={styles.helpOption}>
                <Ionicons name="call-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>{t('auth.mobile.help.tip1')}</Text>
              </View>

              <View style={styles.helpOption}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>{t('auth.mobile.help.tip2')}</Text>
              </View>

              <View style={styles.helpOption}>
                <Ionicons name="chatbubble-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>{t('auth.mobile.help.tip3')}</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
  }, scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Extra space for keyboard avoidance
    paddingTop: 20,
    minHeight: 600, // Fixed height to ensure scrollability
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  logo: {
    width: 320,
    height: 120,
  }, contentContainer: {
    paddingVertical: 22,
  },
  heading: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 50, // Increased margin
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  inputWrapper: {
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  inputWrapperFocused: {
    borderColor: '#007E2F',
    backgroundColor: '#FFFFFF',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#FF3547',
    backgroundColor: '#FFF5F5',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  flagIcon: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#E8E8E8',
    marginRight: 12,
  },
  disabled: {
    backgroundColor: "#f0f0f0",
    color: "#888",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3547',
    marginLeft: 6,
    fontWeight: '500',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 6,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  }, securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  extraSpacing: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  }, nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  // Help Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  helpModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 24,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  helpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  helpOptionText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});

export default MobileScreen;