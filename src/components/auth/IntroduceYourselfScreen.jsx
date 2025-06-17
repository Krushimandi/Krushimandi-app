// File: src/components/IntroduceYourselfScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const IntroduceYourselfScreen = ({navigation, route}) => {
  const { userRole } = route?.params || {};
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const lastNameRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
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

    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Keyboard is shown
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Keyboard is hidden
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [fadeAnim, slideAnim]);
  const handleNext = async () => {
    if (isFormValid) {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('User info:', { firstName, lastName });
        Keyboard.dismiss();
        navigation.navigate('PhotoUpload');
      } catch (err) {
        console.error('Error saving user info:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const showHelp = () => {
    setModalVisible(true);
  };
  const handleFirstNameChange = (text) => {
    setFirstName(text);
    if (errors.firstName) {
      setErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (text) => {
    setLastName(text);
    if (errors.lastName) {
      setErrors(prev => ({ ...prev, lastName: '' }));
    }
  };  const handleFirstNameSubmit = () => {
    setTimeout(() => {
      if (lastNameRef.current) {
        lastNameRef.current.focus();
      }
    }, 100);
  };

  const handleLastNameSubmit = () => {
    Keyboard.dismiss();
    if (isFormValid) {
      handleNext();
    }
  };

  const isFormValid = firstName.trim() && lastName.trim();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.innerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
            </TouchableOpacity>
          </View>          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={false}
          ><Animated.View 
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >              <Text style={styles.heading}>
                Introduce yourself{userRole ? ` as a ${userRole}` : ''}
              </Text>
              <Text style={styles.subtext}>
                Help us personalize your experience by sharing your name
              </Text>

              {/* Profile Avatar Section */}
              <TouchableOpacity style={styles.avatarContainer} onPress={() => console.log('Avatar pressed')}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="camera" size={32} color="#007E2F" />
                </View>
                <Text style={styles.avatarText}>Add Profile Photo</Text>
              </TouchableOpacity>

              {/* Input Fields */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Personal Information</Text>
                
                {/* First Name Input */}
                <View style={[
                  styles.inputWrapper,
                  firstNameFocused && styles.inputWrapperFocused,
                  errors.firstName && styles.inputWrapperError
                ]}>
                  <View style={styles.inputContainer}>
                    <Text style={[
                      styles.floatingLabel, 
                      (firstName || firstNameFocused) && styles.floatingLabelActive
                    ]}>
                      First Name
                    </Text>                    
                    <TextInput
                      style={[styles.input, (firstName || firstNameFocused) && styles.inputWithLabel]}
                      value={firstName}
                      onChangeText={handleFirstNameChange}                      
                      onFocus={() => {
                        setFirstNameFocused(true);
                      }}
                      onSubmitEditing={handleFirstNameSubmit}
                      returnKeyType="next"
                      placeholder=""
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      autoCorrect={false}
                      blurOnSubmit={false}
                      enablesReturnKeyAutomatically={true}
                    />
                  </View>
                </View>

                {/* Last Name Input */}
                <View style={[
                  styles.inputWrapper,
                  lastNameFocused && styles.inputWrapperFocused,
                  errors.lastName && styles.inputWrapperError
                ]}>
                  <View style={styles.inputContainer}>
                    <Text style={[
                      styles.floatingLabel, 
                      (lastName || lastNameFocused) && styles.floatingLabelActive
                    ]}>
                      Last Name
                    </Text>                    
                    <TextInput
                      ref={lastNameRef}
                      style={[styles.input, (lastName || lastNameFocused) && styles.inputWithLabel]}
                      value={lastName}
                      onChangeText={handleLastNameChange}                      onFocus={() => {
                        setLastNameFocused(true);
                      }}
                      onBlur={() => {
                        setLastNameFocused(false);
                      }}
                      onSubmitEditing={handleLastNameSubmit}
                      returnKeyType="done"
                      placeholder=""
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      autoCorrect={false}
                      blurOnSubmit={true}
                      enablesReturnKeyAutomatically={true}
                    />
                  </View>
                </View>
              </View>

              
            </Animated.View>
          </ScrollView>

          {/* Next Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Help Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Need Help?</Text>
            <Text style={styles.modalText}>
              Enter your first and last name as you'd like them to appear in your profile. You can change this later in settings.
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
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
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#007E2F',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 14,
    color: '#007E2F',
    fontWeight: '500',
  },
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
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
  inputContainer: {
    position: 'relative',
    minHeight: 56,
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 18,
    fontSize: 16,
    color: '#999',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  floatingLabelActive: {
    top: 8,
    fontSize: 12,
    color: '#007E2F',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontWeight: '500',
    minHeight: 56,
  },
  inputWithLabel: {
    paddingTop: 24,
    paddingBottom: 12,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 24,
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
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IntroduceYourselfScreen;
