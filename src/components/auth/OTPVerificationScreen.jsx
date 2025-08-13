// File: src/components/OTPVerificationScreen.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Vibration,
  InteractionManager,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { saveUserRole } from '../../utils/userRoleStorage';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';

const OTPVerificationScreen = ({ navigation, route }) => {
  const { phoneNumber, confirmation, setConfirmation, clearConfirmation } = useAuth();
  const [otp, setOtp] = useState(''); // Single string for OTP
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false); const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const inputRef = useRef(null); const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const cursorAnimation = useRef(new Animated.Value(1)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const autoSubmitAnimation = useRef(new Animated.Value(1)).current;
  const lastTapTime = useRef(0);

  const scrollViewRef = useRef(null);

  // Use phone number from context, fallback to route params, then default
  const displayPhoneNumber = phoneNumber || route?.params?.phoneNumber || '+91 XXXXXXXXXX';

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('Keyboard shown');
      setIsKeyboardVisible(true);
      // Scroll to the input field when keyboard appears
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 200,
          animated: true,
        });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('Keyboard hidden');
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Cursor blinking animation
  useEffect(() => {
    const blinkCursor = () => {
      Animated.sequence([
        Animated.timing(cursorAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => blinkCursor());
    };

    if (isFocused) {
      blinkCursor();
    }
  }, [isFocused]);


  useEffect(() => {
    Keyboard.dismiss();
  }, [showHelpModal]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Entrance animation
  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Auto-focus the input when screen loads
    const focusTimer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 800); // Give time for animation to complete

    return () => clearTimeout(focusTimer);
  }, []);

  // Cleanup confirmation on unmount
  useEffect(() => {
    return () => {
      clearConfirmation();
    };
  }, []); const handleOtpChange = (value) => {
    // Only allow digits and limit to 6 characters
    const cleanedValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleanedValue);

    // Clear error when user starts typing or pasting
    if (error) {
      setError('');
    }

    // Auto-submit when 6 digits are entered (from paste or typing)
    if (cleanedValue.length === 6) {
      console.log('Full OTP entered, auto-submitting:', cleanedValue);
      setIsAutoSubmitting(true);
      
      // Subtle pulse animation to indicate auto-submit
      Animated.sequence([
        Animated.timing(autoSubmitAnimation, { 
          toValue: 1.05, 
          duration: 150, 
          useNativeDriver: true 
        }),
        Animated.timing(autoSubmitAnimation, { 
          toValue: 1, 
          duration: 150, 
          useNativeDriver: true 
        }),
      ]).start();
      
      // Small delay to allow UI to update before verification
      setTimeout(() => {
        handleVerifyWithOtp(cleanedValue);
      }, 100);
    } else {
      // Reset auto-submitting state if user is still typing
      setIsAutoSubmitting(false);
      autoSubmitAnimation.setValue(1);
    }
  };


  const handleInputFocus = useCallback(() => {
    console.log('Input focused');
    setIsFocused(true);
    setError(''); // Clear any existing errors when focusing

    // Scroll to input field when keyboard opens
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 200, // Adjust this value based on your layout
        animated: true,
      });
    }, 300);
  }, []);

  const handleInputBlur = () => {
    console.log('Input blurred');
    setIsFocused(false);
  };

  // More robust focus handling with debouncing
  const handleContainerPress = () => {
    const currentTime = Date.now();

    // Prevent rapid successive taps
    if (currentTime - lastTapTime.current < 300) {
      return;
    }
    lastTapTime.current = currentTime;

    console.log('Container pressed, current focus state:', isFocused, 'keyboard visible:', isKeyboardVisible);

    // Visual feedback
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // Clear any errors first
    setError('');

    if (inputRef.current) {
      // Always try to focus, let React Native handle the rest
      inputRef.current.focus();

      // If the input doesn't seem to be responding, use fallback methods
      setTimeout(() => {
        if (inputRef.current && !isKeyboardVisible && !isFocused) {
          console.log('Using fallback focus method');
          inputRef.current.blur();

          // Small delay before refocusing
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 50);
        }
      }, 200);
    }
  };

  // Add method to force focus
  const forceKeyboardOpen = () => {
    if (inputRef.current) {
      inputRef.current.blur();
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      });
    }
  }; 

  // Separate function for verification that accepts OTP parameter (used for auto-submit)
  const handleVerifyWithOtp = async (otpCode) => {
    if (otpCode && otpCode.length === 6) {
      setIsLoading(true);
      setError('');
      try {
        if (!confirmation) {
          throw new Error('No confirmation object found. Please request a new OTP.');
        }

        // Confirm the OTP
        const userCredential = await confirmation.confirm(otpCode);
        console.log('✅ OTP verified successfully for user:', userCredential.user.uid);

        // Import dynamically to avoid circular dependency issues
        const { checkUserExistsInFirestore, saveUserToAsyncStorage } = require('../../services/firebaseService');

        // Check if user data exists in Firestore using phone number
        const result = await checkUserExistsInFirestore(phoneNumber || displayPhoneNumber);

        if (result.exists && result.userData) {
          console.log('✅ User data found in Firestore, restoring session', result.userData);

          // Save user role to localStorage
          if (result.userData.userRole) {
            await saveUserRole(result.userData.userRole);
            console.log('✅ User role saved to localStorage for existing user:', result.userData.userRole);
          }

          // Save the existing user data to AsyncStorage
          await saveUserToAsyncStorage(result.userData);

          // Show success message
          Toast.show({
            type: 'success', // 'success', 'error', 'info'
            text1: 'Welcome Back!',
            position: 'bottom',
            visibilityTime: 1000, // 1 seconds
          });
          // Navigate directly to HomeScreen using our utility function
          import('../../utils/navigationUtils').then(
            ({ navigateToMain }) => navigateToMain()
          );
        } else {
          // User data not found in Firestore, proceed with new user flow
          console.log('❌ User data not found in Firestore, continuing with new user setup');
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'OTP verified successfully!',
            position: 'bottom',
            visibilityTime: 1000,
          });
          // Navigate to role selection for new user setup
          navigation.replace('RoleSelection');
        }

      } catch (err) {
        console.error('OTP Verification Error:', err);

        // Clear the OTP field for wrong OTP
        setOtp('');

        // Handle different error types
        let errorMessage = 'Invalid OTP. Please try again.';
        if (err.code === 'auth/invalid-verification-code') {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (err.code === 'auth/session-expired') {
          errorMessage = 'OTP has expired. Please request a new one.';
          setCanResend(true);
          setTimer(0);
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (err.message && err.message.includes('confirmation')) {
          errorMessage = 'Session expired. Please request a new OTP.';
          setCanResend(true);
          setTimer(0);
        }

        setError(errorMessage);

        // Shake animation for visual feedback
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
        // Vibration feedback with error handling
        try {
          if (Platform.OS === 'android') {
            Vibration.vibrate([0, 100, 50, 100]);
          } else {
            Vibration.vibrate();
          }
        } catch (vibrationError) {
          console.warn('Vibration failed:', vibrationError);
          // Fallback: Just continue without vibration
        }

        // Auto-focus input for retry
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } finally {
        setIsLoading(false);
        setIsAutoSubmitting(false);
      }
    } else {
      setError('Please enter complete 6-digit OTP code');
      // Focus the input if incomplete
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleVerify = async () => {
    // Simply call the new function with the current OTP
    await handleVerifyWithOtp(otp);
  };

  const handleResend = async () => {
    if (canResend) {
      setTimer(60);
      setCanResend(false);
      setOtp('');
      setError('');
      try {
        const newConfirmation = await auth().signInWithPhoneNumber(phoneNumber);
        setConfirmation(newConfirmation);
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'A new OTP has been sent to your phone.',
          position: 'bottom',
          visibilityTime: 1000,
        });
      } catch (err) {
        setError('Failed to resend OTP. Try again.');
      }
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleEditPhone = () => {
    navigation.goBack(); // Go back to mobile screen
  };

  const handleHelp = () => {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  const otpContainerStyle = useMemo(() => [
    styles.otpInputContainer,
    isFocused && styles.otpInputContainerFocused,
    error && styles.otpInputContainerError,
    isPressed && styles.otpInputContainerPressed,
    isAutoSubmitting && styles.otpInputContainerAutoSubmit
  ], [isFocused, error, isPressed, isAutoSubmitting]);

  const isOtpComplete = otp.length === 6;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.innerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>            <TouchableOpacity
              onPress={handleHelp}
              style={styles.helpButton}
              accessible={true}
              accessibilityLabel="Get help with OTP verification"
              accessibilityHint="Shows information about common OTP issues and solutions"
            >
              <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            scrollEnabled={true}
          >
            <TouchableWithoutFeedback onPress={handleOutsidePress}>
              <Animated.View
                style={[
                  styles.content,
                  { opacity: fadeAnimation }
                ]}
              >
                {/* Title */}
                <Text style={styles.title}>We just sent an SMS</Text>              {/* Subtitle with phone number */}
                <Text style={styles.subtitle}>Enter the 6-digit code we sent to</Text>

                <View style={styles.phoneContainer}>
                  <Text style={styles.phoneNumber}>{displayPhoneNumber}</Text>
                  <TouchableOpacity onPress={handleEditPhone} style={styles.editButton}>
                    <Ionicons name="pencil" size={18} color="#007E2F" />
                  </TouchableOpacity>
                </View>              {/* Instruction text */}
                <Text style={styles.instructionText}>
                  {isAutoSubmitting 
                    ? '✓ Complete code detected! Auto-verifying...' 
                    : 'Tap the field below and enter your verification code or paste it directly'
                  }
                </Text>

                {/* OTP Input Field */}
                <Animated.View
                  style={[
                    styles.otpContainer,
                    { 
                      transform: [
                        { translateX: shakeAnimation },
                        { scale: autoSubmitAnimation }
                      ] 
                    }
                  ]}
                >
                  <TouchableWithoutFeedback onPress={handleContainerPress}>
                    <View style={otpContainerStyle}>
                      {/* TextInput - Made more accessible and robust with paste support */}
                      <TextInput
                        ref={inputRef}
                        style={styles.hiddenInput}
                        value={otp}
                        onChangeText={handleOtpChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoComplete="sms-otp"
                        textContentType="oneTimeCode"
                        autoFocus={false}
                        blurOnSubmit={false}
                        caretHidden={false}
                        selectTextOnFocus={true}
                        contextMenuHidden={false}
                        importantForAccessibility="yes"
                        accessible={true}
                        accessibilityLabel="OTP Input Field"
                        editable={true}
                        showSoftInputOnFocus={true}
                        multiline={false}
                        numberOfLines={1}
                        allowFontScaling={false}
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />{/* Visual OTP Display */}
                      <TouchableOpacity
                        style={styles.otpDisplayContainer}
                        onPress={handleContainerPress}
                        activeOpacity={1}
                      >
                        {[...Array(6)].map((_, index) => (
                          <View key={index} style={styles.otpDigitContainer}>
                            <Text style={[
                              styles.otpDigit,
                              otp[index] && styles.otpDigitFilled
                            ]}>
                              {otp[index] || ''}
                            </Text>
                            {index < 5 && <View style={styles.separator} />}
                          </View>
                        ))}
                      </TouchableOpacity>
                      {/* Cursor */}
                      {isFocused && otp.length < 6 && (
                        <Animated.View
                          style={[
                            styles.cursor,
                            {
                              left: 32 + (otp.length * 38), top: 22,
                              opacity: cursorAnimation,
                            }
                          ]} />
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                </Animated.View>              {/* Error message */}
                {error ? (
                  <Animated.View style={[
                    styles.errorContainer,
                    { transform: [{ translateX: shakeAnimation }] }
                  ]}>
                    <Ionicons name="alert-circle" size={18} color="#FF3547" />
                    <Text style={styles.errorText}>{error}</Text>                  <TouchableOpacity onPress={handleHelp} style={styles.helpIconSmall}>
                      <Ionicons name="help-circle" size={16} color="#007E2F" />
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}

                {/* Security note
              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark" size={16} color="#007E2F" />
                <Text style={styles.securityText}>
                  Code expires in {formatTime(timer)}. Keep this window open.
                </Text>
              </View> */}

                {/* Resend Section */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                  <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                    <Text style={[
                      styles.resendLink,
                      !canResend && styles.resendLinkDisabled
                    ]}>{canResend ? 'Resend code' : `Resend in ${formatTime(timer)}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </ScrollView>

          {/* Verify Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                !isOtpComplete && styles.verifyButtonDisabled
              ]}
              onPress={handleVerify}
              disabled={!isOtpComplete}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>
                    {isAutoSubmitting ? 'Auto-Verifying...' : 'Verify Code'}
                  </Text>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </>
              )}            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Beautiful Help Modal */}
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
              <Text style={styles.modalTitle}>Need Help?</Text>
              <TouchableOpacity onPress={closeHelpModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>Having trouble with your code?</Text>

              <View style={styles.helpOption}>
                <Ionicons name="chatbubble-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>Check your SMS messages</Text>
              </View>

              <View style={styles.helpOption}>
                <Ionicons name="time-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>Code expires in a few minutes</Text>
              </View>

              <View style={styles.helpOption}>
                <Ionicons name="clipboard-outline" size={20} color="#007E2F" />
                <Text style={styles.helpOptionText}>You can paste the code directly</Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  closeHelpModal();
                  if (canResend) {
                    handleResend();
                  }
                }}
                disabled={!canResend}
              >
                <Ionicons name="refresh" size={18} color={canResend ? "#007E2F" : "#999"} />
                <Text style={[styles.actionButtonText, !canResend && styles.actionButtonTextDisabled]}>
                  {canResend ? 'Resend Code' : `Wait ${formatTime(timer)}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  closeHelpModal();
                  handleEditPhone();
                }}
              >
                <Ionicons name="pencil" size={18} color="#007E2F" />
                <Text style={styles.actionButtonText}>Edit Phone</Text>
              </TouchableOpacity>
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
  keyboardAvoidingView: {
    flex: 1,
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
  }, helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Extra space for keyboard avoidance
    paddingTop: 20,
    minHeight: 600, // Ensure scrollability like MobileScreen
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  phoneNumber: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    marginRight: 8,
  }, editButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#E8F5E8',
  }, instructionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  pasteHint: {
    fontSize: 12,
    color: '#007E2F',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  otpInputContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: 70,
    justifyContent: 'center',
    position: 'relative',
  },
  otpInputContainerFocused: {
    borderColor: '#007E2F',
    backgroundColor: '#FFFFFF',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  }, otpInputContainerError: {
    borderColor: '#FF3547',
    backgroundColor: '#FFF5F5',
  },
  otpInputContainerPressed: {
    backgroundColor: '#F0F8F0',
    transform: [{ scale: 0.98 }],
  },
  otpInputContainerAutoSubmit: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }, hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01, // Make slightly visible for paste functionality
    zIndex: 2,
    fontSize: 24,
    textAlign: 'center',
    color: 'transparent',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  otpDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    width: 30,
    textAlign: 'center',
    minHeight: 30,
    lineHeight: 30,
  },
  otpDigitFilled: {
    color: '#007E2F',
  },
  separator: {
    width: 8,
    height: 2,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
    borderRadius: 1,
  }, cursor: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 24,
    backgroundColor: '#007E2F',
    borderRadius: 1,
  }, errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    justifyContent: 'center',
  }, errorText: {
    fontSize: 14,
    color: '#FF3547',
    marginLeft: 8,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    lineHeight: 20,
  },
  helpIconSmall: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#E8F5E8',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  resendLink: {
    fontSize: 14,
    color: '#007E2F',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
    textDecorationLine: 'none',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  }, verifyButtonText: {
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
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0E7D0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007E2F',
    marginLeft: 6,
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
});

export default OTPVerificationScreen;
