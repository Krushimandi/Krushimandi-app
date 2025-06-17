// File: src/components/OTPVerificationScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Vibration,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const OTPVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(''); // Single string for OTP
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const cursorAnimation = useRef(new Animated.Value(1)).current;

  // Get phone number from navigation params
  const phoneNumber = route?.params?.phone || '+91 XXXXXXXXXX';

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
  }, []);
  const handleOtpChange = (value) => {
    // Only allow digits and limit to 6 characters
    const cleanedValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleanedValue);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
  }; const handleVerify = async () => {
    if (otp.length === 6) {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));        console.log('OTP Code:', otp);
        Alert.alert('Success', 'OTP verified successfully!');
        navigation.navigate('RoleSelection');
      } catch (err) {
        setError('Invalid OTP. Please try again.');
        // Shake animation for error
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        Vibration.vibrate(400);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Please enter complete 6-digit OTP code');
    }
  }; const handleResend = () => {
    if (canResend) {
      setTimer(60);
      setCanResend(false);
      setOtp(''); // Clear OTP
      inputRef.current?.focus();
      console.log('Resending OTP...');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };
  const handleEditPhone = () => {
    navigation.goBack(); // Go back to mobile screen
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

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
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >            <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnimation }
            ]}
          >
              {/* Title */}
              <Text style={styles.title}>We just sent an SMS</Text>              {/* Subtitle with phone number */}
              <Text style={styles.subtitle}>Enter the 6-digit code we sent to</Text>

              <View style={styles.phoneContainer}>
                <Text style={styles.phoneNumber}>{phoneNumber}</Text>
                <TouchableOpacity onPress={handleEditPhone} style={styles.editButton}>
                  <Ionicons name="pencil" size={18} color="#007E2F" />
                </TouchableOpacity>
              </View>

              {/* Instruction text */}
              <Text style={styles.instructionText}>
                Tap the field below and enter your verification code
              </Text>{/* OTP Input Field */}
              <Animated.View
                style={[
                  styles.otpContainer,
                  { transform: [{ translateX: shakeAnimation }] }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.otpInputContainer,
                    isFocused && styles.otpInputContainerFocused,
                    error && styles.otpInputContainerError
                  ]}
                  onPress={() => inputRef.current?.focus()}
                  activeOpacity={1}
                >
                  {/* Hidden TextInput */}
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
                  />

                  {/* Visual OTP Display */}
                  <View style={styles.otpDisplayContainer}>
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
                  </View>
                  {/* Cursor */}
                  {isFocused && otp.length < 6 && (
                    <Animated.View
                      style={[
                        styles.cursor,
                        {
                          left: 32 + (otp.length * 38),
                          top: 22,
                          opacity: cursorAnimation,
                        }
                      ]}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Error message */}
              {error ? (
                <Animated.View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3547" />
                  <Text style={styles.errorText}>{error}</Text>
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
                  <Text style={styles.verifyButtonText}>Verify Code</Text>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 180,
    paddingTop: 20,
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
  },
  instructionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
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
  },
  otpInputContainerError: {
    borderColor: '#FF3547',
    backgroundColor: '#FFF5F5',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
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
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3547',
    marginLeft: 6,
    fontWeight: '500',
    textAlign: 'center',
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
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default OTPVerificationScreen;
