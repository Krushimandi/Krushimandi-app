// File: src/components/AddFruitScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  Keyboard,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  BackHandler
} from 'react-native';
import ReAnimated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTabBarControl } from '../../utils/navigationControls';
import { checkAndPromptGPSSettings, getLocationWithCache } from '../../utils/permissions';
import { initializeLocationCache } from '../../utils/locationCache';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Debounce utility function with cancel method
const debounce = (func, wait) => {
  let timeout;

  const debouncedFunction = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunction;
};

const AddFruitScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { hideTabBar, showTabBar } = useTabBarControl();

  // Form state
  const [fruitName, setFruitName] = useState('');
  const [category, setCategory] = useState('banana');
  const [quantity, setQuantity] = useState('10-12');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  // Form validation and UI states
  const [isFormValid, setIsFormValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});

  // Availability date state
  const [availabilityDate, setAvailabilityDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Location states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');


  const insets = useSafeAreaInsets();

  // Refs
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({
    fruitName: null,
    city: null,
    district: null,
    state: null,
    pincode: null,
    description: null
  });

  // Animations
  const [progress, setProgress] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const categories = [
    { id: 'banana', name: t('fruits.banana') },
    { id: 'sweet lemon', name: t('fruits.sweetLemon') },
    // { id: 'orange', name: t('fruits.orange') },
    // { id: 'grape', name: t('fruits.grape') },
    // { id: 'pomegranate', name: t('fruits.pomegranate') },
    // { id: 'apple', name: t('fruits.apple') },
    // { id: 'mango', name: t('fruits.mango') }
  ];

  const quantities = [
    { id: '1-2', name: `1-2 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.small') },
    { id: '3-5', name: `3-5 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.medium') },
    { id: '6-9', name: `6-9 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.large') },
    { id: '10-12', name: `10-12 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.veryLarge') },
    { id: '13-15', name: `13-15 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.bulk') },
    { id: '16-20', name: `16-20 ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.commercial') },
    { id: '20+', name: `20+ ${t('units.ton_other')}`, desc: t('product.add.quantity.desc.industrial') }
  ];

  // Enhanced scroll to input with keyboard-aware logic
  const scrollToInput = useCallback((inputKey) => {
    const inputRef = inputRefs.current[inputKey];
    if (!inputRef || !scrollViewRef.current) return;

    const locationInputs = ['city', 'district', 'state', 'pincode'];
    const isLocationInput = locationInputs.includes(inputKey);

    setTimeout(() => {
      if (isLocationInput) {
        // For location inputs, calculate position based on form structure
        const scrollPositions = {
          city: 450,
          district: 450,
          state: 520,
          pincode: 520
        };

        const scrollPosition = scrollPositions[inputKey] || 450;

        scrollViewRef.current?.scrollTo({
          y: scrollPosition,
          animated: true
        });
      } else if (inputKey === 'description') {
        // Description is at the bottom
        scrollViewRef.current?.scrollTo({
          y: 650,
          animated: true
        });
      } else {
        // For top inputs, minimal scroll
        scrollViewRef.current?.scrollTo({
          y: 50,
          animated: true
        });
      }
    }, 250); // Wait for keyboard animation
  }, []);

  // Enhanced input handlers with validation
  const handleInputChange = useCallback((field, value) => {
    // Mark field as touched when user starts typing
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    switch (field) {
      case 'fruitName':
        setFruitName(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'city':
        setCity(value);
        break;
      case 'district':
        setDistrict(value);
        break;
      case 'state':
        setState(value);
        break;
      case 'pincode':
        // Only allow numeric input for pincode
        const numericValue = value.replace(/[^0-9]/g, '');
        setPincode(numericValue);
        break;
    }

    // Only clear the error for the current field being edited
    // This prevents continuous refreshing of other error states
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Enhanced focus handler with immediate scroll
  const handleInputFocus = useCallback((inputKey) => {
    setFocusedInput(inputKey);
    // Mark field as touched when focused
    setTouchedFields(prev => ({ ...prev, [inputKey]: true }));

    // Immediate scroll for better UX
    scrollToInput(inputKey);
  }, [scrollToInput]);

  // Shake animation for invalid form
  const shakeForm = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  }, [shakeAnim]);


  const handleContinue = async () => {
    if (isSubmitting) return;

    // Show validation errors when user tries to submit
    setShowValidationErrors(true);

    if (!validateForm()) {
      shakeForm();

      // Show focused alert with only the current error
      const currentError = Object.values(validationErrors)[0];
      const currentField = Object.keys(validationErrors)[0];

      let fieldName = currentField;
      switch (currentField) {
        case 'fruitName':
          fieldName = t('product.add.fields.fruitName');
          break;
        case 'description':
          fieldName = t('product.add.fields.description');
          break;
        case 'city':
          fieldName = t('product.add.fields.cityVillage');
          break;
        case 'district':
          fieldName = t('product.add.fields.district');
          break;
        case 'state':
          fieldName = t('product.add.fields.state');
          break;
        case 'pincode':
          fieldName = t('product.add.fields.pincode');
          break;
      }

      Alert.alert(
        t('product.add.alerts.completeFormTitle'),
        `${currentError || t('validation.fixBeforeSave')}`,
        [{ text: t('product.add.alerts.ok') }]
      );
      return;
    }

    // Clear validation errors when form is valid
    setShowValidationErrors(false);
    setValidationErrors({});
    setIsSubmitting(true);

    try {
      // Get current user data for farmer_id
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.uid) {
        Alert.alert(t('product.add.alerts.authErrorTitle'), t('product.add.alerts.loginToContinue'));
        setIsSubmitting(false);
        return;
      }

      // Parse quantity range
      const quantityParts = quantity.includes('+')
        ? [parseInt(quantity.replace('+', '')), parseInt(quantity.replace('+', '')) + 5]
        : quantity.split('-').map(q => parseInt(q.trim()));

      // Get selected category object
      const selectedCategory = categories.find(cat => cat.id === category);

      const fruitData = {
        name: fruitName.trim(),
        type: category,
        quantity: quantityParts,
        description: description.trim(),
        availability_date: availabilityDate || null,
        location: {
          city: city.trim(),
          district: district.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          lat: currentLocation?.lat || 0,
          lng: currentLocation?.lng || 0
        },
        farmer_id: user.uid,
        status: 'active',
        views: 0,
        likes: 0,
        // Additional metadata for better UX
        categoryInfo: selectedCategory,
        createdBy: {
          name: user.firstName || 'Farmer',
          uid: user.uid
        }
      };


      Keyboard.dismiss();
      // Navigate to PhotoUpload screen with the fruit data
      navigation.navigate('PhotoUpload', { fruitData });

    } catch (error) {
      Alert.alert(t('alerts.errorTitle'), t('farmerHome.refreshFailedSubtitle'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;

    showTabBar(); // Ensure tab bar is visible when going back
    navigation.goBack();
  };

  // Enhanced location handling with better error management
  const handleGetLocation = async () => {
    if (isGettingLocation) return;

    setIsGettingLocation(true);
    setLocationError('');

    try {
      // First check if GPS is enabled and prompt user if not
      const gpsEnabled = await checkAndPromptGPSSettings();
      if (!gpsEnabled) {
        setIsGettingLocation(false);
        return; // User chose to fill manually or went to settings
      }

      // Use cached location method for faster response
      const result = await getLocationWithCache();

      if (result && result.location && result.locationData) {
        const { location, locationData } = result;

        setCurrentLocation({ lat: location.latitude, lng: location.longitude });

        // Always fill city (fallback to district if city is empty)
        const cityToFill = locationData.city || locationData.district || '';

        setCity(cityToFill);
        setDistrict(locationData.district || cityToFill);
        setState(locationData.state || '');
        setPincode(locationData.pincode || '');

        // Clear any location errors
        setLocationError('');
      } else {
        setLocationError(t('product.add.location.addressLookupFailed'));
      }
    } catch (error) {
      const message = error.userMessage || error.message || t('product.add.location.genericErrorMessage');
      setLocationError(message);

      // Enhanced error handling for different location error types
      if (error.code === 2) {
        // GPS/Location Services are disabled
        Alert.alert(
          t('product.add.location.gpsOffTitle'),
          t('product.add.location.gpsOffMessage'),
          [
            { text: t('product.add.location.fillManually'), style: 'cancel' },
            {
              text: t('product.add.location.openSettings'),
              onPress: () => {
                // For Android, you can use Linking to open location settings
                if (Platform.OS === 'android') {
                  Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                } else {
                  // For iOS, open general settings
                  Linking.openSettings();
                }
              }
            },
            { text: t('product.add.location.tryAgain'), onPress: () => handleGetLocation() }
          ]
        );
      } else if (error.code === 1) {
        // Permission denied
        Alert.alert(
          t('product.add.location.permissionRequiredTitle'),
          t('product.add.location.permissionRequiredMessage'),
          [
            { text: t('product.add.location.fillManually'), style: 'cancel' },
            {
              text: t('product.add.location.openSettings'),
              onPress: () => {
                Linking.openSettings();
              }
            },
            { text: t('product.add.location.tryAgain'), onPress: () => handleGetLocation() }
          ]
        );
      } else {
        // Other location errors
        Alert.alert(
          t('product.add.location.genericErrorTitle'),
          message,
          [
            { text: t('product.add.location.fillManually'), style: 'cancel' },
            { text: t('product.add.location.tryAgain'), onPress: () => handleGetLocation() }
          ]
        );
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Enhanced validation function - shows only one error at a time
  const validateForm = useCallback(() => {
    const errors = {};
    let isValid = true;
    let firstError = null;

    // Clear all previous errors first
    setValidationErrors({});

    // Priority order for validation (show most important first)

    // 1. Fruit name validation (highest priority)
    if (!fruitName.trim()) {
      firstError = firstError || { field: 'fruitName', message: t('product.add.validation.fruitNameRequired') };
      isValid = false;
    } else if (fruitName.trim().length < 2) {
      firstError = firstError || { field: 'fruitName', message: t('product.add.validation.fruitNameMin') };
      isValid = false;
    }

    // 2. Availability date (new requirement)
    if (!availabilityDate) {
      firstError = firstError || { field: 'availabilityDate', message: t('product.add.validation.availabilityDateRequired') };
      isValid = false;
    }

    // 3. Location validation (second priority)
    if (!city.trim()) {
      firstError = firstError || { field: 'city', message: t('product.add.validation.cityRequired') };
      isValid = false;
    }
    if (!district.trim()) {
      firstError = firstError || { field: 'district', message: t('product.add.validation.districtRequired') };
      isValid = false;
    }
    if (!state.trim()) {
      firstError = firstError || { field: 'state', message: t('product.add.validation.stateRequired') };
      isValid = false;
    }
    if (!pincode.trim()) {
      firstError = firstError || { field: 'pincode', message: t('product.add.validation.pincodeRequired') };
      isValid = false;
    } else if (!/^\d{6}$/.test(pincode.trim())) {
      firstError = firstError || { field: 'pincode', message: t('product.add.validation.pincodeInvalid') };
      isValid = false;
    }

    // 4. Description validation (lowest priority)
    if (!description.trim()) {
      firstError = firstError || { field: 'description', message: t('product.add.validation.descriptionRequired') };
      isValid = false;
    } else if (description.trim().length < 20) {
      firstError = firstError || { field: 'description', message: t('product.add.validation.descriptionMin') };
      isValid = false;
    }

    // Only show the first error found
    if (firstError) {
      errors[firstError.field] = firstError.message;
    }

    setValidationErrors(errors);
    setIsFormValid(isValid);
    return isValid;
  }, [fruitName, availabilityDate, city, district, state, pincode, description]);

  // Debounced validation to prevent continuous updates while typing
  const debouncedValidation = useCallback(
    debounce(() => {
      validateForm();
    }, 300),
    [validateForm]
  );

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const totalFields = 10; // includes availability date
    let filled = 0;

    if (fruitName.trim()) filled++;
    if (category) filled++;
    if (quantity) filled++;
    if (description.trim() && description.trim().length >= 20) filled++;
    if (availabilityDate) filled++;
    if (city.trim()) filled++;
    if (district.trim()) filled++;
    if (state.trim()) filled++;
    if (pincode.trim() && /^\d{6}$/.test(pincode.trim())) filled++;

    return (filled / totalFields) * 0.33; // 33% of total journey
  }, [fruitName, category, availabilityDate, quantity, description, city, district, state, pincode]);

  // Form validation effect - use debounced validation to prevent continuous updates
  useEffect(() => {
    // For immediate form validation state (isFormValid)
    const isValid = fruitName.trim() &&
      availabilityDate &&
      city.trim() &&
      district.trim() &&
      state.trim() &&
      pincode.trim() &&
      /^\d{6}$/.test(pincode.trim()) &&
      description.trim() &&
      description.trim().length >= 20;

    setIsFormValid(isValid);

    // For error display - use debounced validation
    debouncedValidation();

    const newProgress = calculateProgress();
    setProgress(newProgress);
  }, [fruitName, availabilityDate, city, district, state, pincode, description, debouncedValidation, calculateProgress]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedValidation.cancel?.();
    };
  }, [debouncedValidation]);

  // Progress animation effect
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, slideAnim]);

  // Initialize location cache on component mount for faster location responses
  useEffect(() => {
    const initializeCache = async () => {
      try {
        await initializeLocationCache();
      } catch (error) {
        // Silent fail - cache initialization is not critical
      }
    };

    initializeCache();
  }, []);

  // Animated style for the fake view at bottom
  const fakeViewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      height: withTiming(keyboardHeightAnimated.value, { duration: 10 }),
    };
  });

  // Hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showCategoryModal || showQuantityModal) {
        setShowCategoryModal(false);
        setShowQuantityModal(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showCategoryModal, showQuantityModal]);

  // Enhanced modal close handlers
  const closeModal = useCallback((modalType) => {
    switch (modalType) {
      case 'category':
        setShowCategoryModal(false);
        break;
      case 'quantity':
        setShowQuantityModal(false);
        break;
    }
  }, []);

  // Tab bar control - hide when screen is focused, show when leaving
  useFocusEffect(
    React.useCallback(() => {
      hideTabBar();

      // Cleanup function to show tab bar when screen loses focus
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"

        barStyle="dark-content"
      />
      <View style={styles.container}>
        {/* Modern Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('product.add.headerTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('product.add.stepOfTotal', { step: 1, total: 3 })}</Text>
          </View>

          <View style={styles.headerActions} />
        </View>

        {/* Modern Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% {t('product.add.complete')}
          </Text>
        </View>

        <Animated.View style={[styles.contentContainer, { transform: [{ translateX: shakeAnim }] }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            <View style={styles.content}>
              {/* Fruit Name Input */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="leaf-outline" size={16} color="#00C851" /> {t('product.add.labels.fruitName')} *
                </Text>
                <TextInput
                  ref={(ref) => inputRefs.current.fruitName = ref}
                  style={[
                    styles.modernInput,
                    focusedInput === 'fruitName' && styles.modernInputFocused,
                    (showValidationErrors || touchedFields.fruitName) && validationErrors.fruitName && styles.modernInputError
                  ]}
                  value={fruitName}
                  onChangeText={(value) => handleInputChange('fruitName', value)}
                  onFocus={() => handleInputFocus('fruitName')}
                  onBlur={() => setFocusedInput('')}
                  placeholder={t('product.add.placeholders.fruitName')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => inputRefs.current.city?.focus()}
                />
                {(showValidationErrors || touchedFields.fruitName) && validationErrors.fruitName && (
                  <Text style={styles.errorText}>{validationErrors.fruitName}</Text>
                )}
              </View>

              {/* Category Selection */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="apps-outline" size={16} color="#00C851" /> {t('product.add.labels.category')} *
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowCategoryModal(true)}
                  accessible={true}
                  accessibilityLabel={t('product.add.a11y.selectFruitCategory')}
                  accessibilityHint={t('product.add.a11y.opensCategoryModal')}
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.modernDropdownText}>
                      {categories.find(cat => cat.id === category)?.name || category}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Grade Selection */}
              {/* <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="star-outline" size={16} color="#00C851" /> Quality Grade *
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowGradeModal(true)}
                  accessible={true}
                  accessibilityLabel="Select quality grade"
                  accessibilityHint="Opens grade selection modal"
                >
                  <View style={styles.dropdownContent}>
                    <View style={[
                      styles.gradeIndicator,
                      { backgroundColor: grades.find(g => g.id === grade)?.color || '#00C851' }
                    ]} />
                    <Text style={styles.modernDropdownText}>
                      {grades.find(g => g.id === grade)?.name || `Grade ${grade}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              </View> */}

              {/* Quantity Selection */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="scale-outline" size={16} color="#00C851" /> {t('product.add.labels.availableQuantity')} *
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowQuantityModal(true)}
                  accessible={true}
                  accessibilityLabel={t('product.add.a11y.selectAvailableQuantity')}
                  accessibilityHint={t('product.add.a11y.opensQuantityModal')}
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.quantityIcon}>⚖️</Text>
                    <Text style={styles.modernDropdownText}>
                      {quantities.find(q => q.id === quantity)?.name || `${quantity} ${t('units.ton_other')}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Availability Date Picker (below Quantity) */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="calendar-outline" size={16} color="#00C851" /> {t('product.add.labels.availabilityDate')} *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.modernInput,
                    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                    (showValidationErrors || touchedFields.availabilityDate) && !availabilityDate && styles.modernInputError
                  ]}
                  onPress={() => {
                    setTouchedFields(prev => ({ ...prev, availabilityDate: true }));
                    setShowDatePicker(true);
                  }}
                  accessible={true}
                  accessibilityLabel={t('product.add.a11y.selectAvailabilityDate')}
                  accessibilityHint={t('product.add.a11y.opensDatePicker')}
                >
                  <Text style={{ color: availabilityDate ? '#111827' : '#94A3B8', fontSize: 16 }}>
                    {availabilityDate ? new Date(availabilityDate).toLocaleDateString() : t('product.add.placeholders.availabilityDate')}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#64748B" />
                </TouchableOpacity>
                {(showValidationErrors || touchedFields.availabilityDate) && !availabilityDate && (
                  <Text style={styles.errorText}>{t('product.add.validation.availabilityDateRequired')}</Text>
                )}
                {showDatePicker && (
                  <DateTimePicker
                    value={availabilityDate ? new Date(availabilityDate) : new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setAvailabilityDate(selectedDate.toISOString());
                        setTouchedFields(prev => ({ ...prev, availabilityDate: true }));
                      }
                    }}
                  />
                )}
              </View>

              {/* Location Section */}
              <View style={styles.modernSectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.modernSectionTitle}>
                    <Ionicons name="location-outline" size={18} color="#00C851" /> {t('product.add.labels.farmLocation')} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.singleLocationButton,
                      isGettingLocation && styles.locationButtonDisabled
                    ]}
                    onPress={handleGetLocation}
                    disabled={isGettingLocation}
                    accessible={true}
                    accessibilityLabel={t('product.add.a11y.getCurrentLocation')}
                    accessibilityHint={t('product.add.a11y.getLocationHint')}
                  >
                    {isGettingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="my-location" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.locationButtonText}>
                      {isGettingLocation ? t('product.add.actions.getting') : t('product.add.actions.getLocation')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {locationError ? (
                  <Text style={styles.locationErrorText}>
                    ⚠️ {locationError}
                  </Text>
                ) : null}

                <View style={styles.locationGrid}>
                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>{t('product.add.labels.cityVillage')} *</Text>
                    <TextInput
                      ref={(ref) => inputRefs.current.city = ref}
                      style={[
                        styles.modernInput,
                        focusedInput === 'city' && styles.modernInputFocused,
                        (showValidationErrors || touchedFields.city) && validationErrors.city && styles.modernInputError
                      ]}
                      value={city}
                      onChangeText={(value) => handleInputChange('city', value)}
                      onFocus={() => handleInputFocus('city')}
                      onBlur={() => setFocusedInput('')}
                      placeholder={t('product.add.placeholders.city')}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => inputRefs.current.district?.focus()}
                    />
                    {(showValidationErrors || touchedFields.city) && validationErrors.city && (
                      <Text style={styles.errorText}>{validationErrors.city}</Text>
                    )}
                  </View>

                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>{t('product.add.labels.district')} *</Text>
                    <TextInput
                      ref={(ref) => inputRefs.current.district = ref}
                      style={[
                        styles.modernInput,
                        focusedInput === 'district' && styles.modernInputFocused,
                        (showValidationErrors || touchedFields.district) && validationErrors.district && styles.modernInputError
                      ]}
                      value={district}
                      onChangeText={(value) => handleInputChange('district', value)}
                      onFocus={() => handleInputFocus('district')}
                      onBlur={() => setFocusedInput('')}
                      placeholder={t('product.add.placeholders.district')}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => inputRefs.current.state?.focus()}
                    />
                    {(showValidationErrors || touchedFields.district) && validationErrors.district && (
                      <Text style={styles.errorText}>{validationErrors.district}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.locationGrid}>
                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>{t('product.add.labels.state')} *</Text>
                    <TextInput
                      ref={(ref) => inputRefs.current.state = ref}
                      style={[
                        styles.modernInput,
                        focusedInput === 'state' && styles.modernInputFocused,
                        (showValidationErrors || touchedFields.state) && validationErrors.state && styles.modernInputError
                      ]}
                      value={state}
                      onChangeText={(value) => handleInputChange('state', value)}
                      onFocus={() => handleInputFocus('state')}
                      onBlur={() => setFocusedInput('')}
                      placeholder={t('product.add.placeholders.state')}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => inputRefs.current.pincode?.focus()}
                    />
                    {(showValidationErrors || touchedFields.state) && validationErrors.state && (
                      <Text style={styles.errorText}>{validationErrors.state}</Text>
                    )}
                  </View>

                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>{t('product.add.labels.pincode')} *</Text>
                    <TextInput
                      ref={(ref) => inputRefs.current.pincode = ref}
                      style={[
                        styles.modernInput,
                        focusedInput === 'pincode' && styles.modernInputFocused,
                        (showValidationErrors || touchedFields.pincode) && validationErrors.pincode && styles.modernInputError
                      ]}
                      value={pincode}
                      onChangeText={(value) => handleInputChange('pincode', value)}
                      onFocus={() => handleInputFocus('pincode')}
                      onBlur={() => setFocusedInput('')}
                      placeholder={t('product.add.placeholders.pincode')}
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={6}
                      returnKeyType="done"
                    />
                    {(showValidationErrors || touchedFields.pincode) && validationErrors.pincode && (
                      <Text style={styles.errorText}>{validationErrors.pincode}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="document-text-outline" size={16} color="#00C851" /> {t('product.add.labels.description')} *
                  <Text style={styles.characterCount}>
                    {t('product.add.characters.minCharsLabel', { count: description.replace(/\n/g, "").trim().length })}
                  </Text>
                </Text>
                <TextInput
                  ref={(ref) => inputRefs.current.description = ref}
                  style={[
                    styles.modernInput,
                    styles.modernTextArea,
                    focusedInput === 'description' && styles.modernInputFocused,
                    (showValidationErrors || touchedFields.description) && validationErrors.description && styles.modernInputError
                  ]}
                  value={description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  onFocus={() => handleInputFocus('description')}
                  onBlur={() => setFocusedInput('')}
                  placeholder={t('product.add.placeholders.description')}
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  returnKeyType="default"
                />
                <View style={styles.characterCounter}>
                  <Text style={styles.characterCounterText}>
                    {t('product.add.characters.remaining', { remaining: 500 - description.length })}
                  </Text>
                </View>
                {(showValidationErrors || touchedFields.description) && validationErrors.description && (
                  <Text style={styles.errorText}>{validationErrors.description}</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Modern Continue Button */}
        <View style={styles.modernButtonContainer}>
          <TouchableOpacity
            style={[
              styles.modernContinueButton,
              (!isFormValid || isSubmitting) && styles.modernButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isFormValid || isSubmitting}
            accessible={true}
            accessibilityLabel={isFormValid ? t('product.add.actions.continue') : t('product.add.actions.formIncomplete')}
            accessibilityHint={isFormValid ? t('product.add.a11y.continueHint') : t('product.add.a11y.incompleteHint')}
          >
            <Text style={styles.modernButtonText}>
              {isSubmitting ? t('product.add.actions.processing') : t('product.add.actions.continue')}
            </Text>
            {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonIcon} />}
          </TouchableOpacity>

          {
            isFormValid && <Text style={styles.buttonHelpText}>
              {t('product.add.help.allGoodAddPhotos')}
            </Text>
          }
        </View>

        {/* Fake animated view at bottom to push content up when keyboard opens */}
        <ReAnimated.View style={fakeViewAnimatedStyle} />

        {/* Modern Category Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showCategoryModal}
          onRequestClose={() => closeModal('category')}
        >
          <Pressable
            style={styles.modernModalOverlay}
            onPress={() => closeModal('category')}
          >
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>{t('product.add.modals.selectCategory')}</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => closeModal('category')}
                  accessible={true}
                  accessibilityLabel={t('product.add.a11y.closeModal')}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.modernModalOption,
                      category === cat.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setCategory(cat.id);
                      closeModal('category');
                    }}
                    accessible={true}
                    accessibilityLabel={t('product.add.a11y.selectCategoryOption', { name: cat.name })}
                    accessibilityRole="button"
                  >
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.modernOptionText,
                        category === cat.id && styles.modernSelectedText
                      ]}>
                        {cat.name}
                      </Text>
                    </View>
                    {category === cat.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#00C851" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Modern Quantity Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showQuantityModal}
          onRequestClose={() => closeModal('quantity')}
        >
          <Pressable
            style={styles.modernModalOverlay}
            onPress={() => closeModal('quantity')}
          >
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>{t('product.add.modals.selectQuantity')}</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => closeModal('quantity')}
                  accessible={true}
                  accessibilityLabel={t('product.add.a11y.closeModal')}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {quantities.map((qty, index) => (
                  <TouchableOpacity
                    key={qty.id}
                    style={[
                      styles.modernModalOption,
                      quantity === qty.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setQuantity(qty.id);
                      closeModal('quantity');
                    }}
                    accessible={true}
                    accessibilityLabel={t('product.add.a11y.selectQuantityOption', { name: qty.name, desc: qty.desc })}
                    accessibilityRole="button"
                  >
                    <Text style={styles.quantityIconLarge}>⚖️</Text>
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.modernOptionText,
                        quantity === qty.id && styles.modernSelectedText
                      ]}>
                        {qty.name}
                      </Text>
                      <Text style={styles.optionSubText}>{qty.desc}</Text>
                    </View>
                    {quantity === qty.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#00C851" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Modern Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  headerActions: {
    width: 36,
    alignItems: 'center',
  },

  // Modern Progress Styles
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Base padding for button container
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Modern Input Styles
  modernInputContainer: {
    marginBottom: 24,
  },
  modernLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  modernTextArea: {
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  modernInputFocused: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },

  modernInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
    marginLeft: 4,
  },
  characterCounter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  characterCounterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  locationErrorText: {
    color: '#F59E0B',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  locationButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Modern Dropdown Styles
  modernDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernDropdownText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },

  // Location Section
  modernSectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  singleLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  locationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
    minWidth: '47%',
  },

  // Dropdown Content Styles
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quantityIcon: {
    fontSize: 18,
    marginRight: 12,
  },

  // Modern Button Styles
  modernButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10, // Safe area bottom padding
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  modernContinueButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modernButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 10,
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonHelpText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: -6,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Modern Modal Styles
  modernModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modernModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modernModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modernSelectedOption: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  quantityIconLarge: {
    fontSize: 20,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  modernOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modernSelectedText: {
    color: '#059669',
  },
  optionSubText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default AddFruitScreen;
