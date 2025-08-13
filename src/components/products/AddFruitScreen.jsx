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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  BackHandler,
  Linking
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTabBarControl } from '../../utils/navigationControls';
import { getCurrentLocation, reverseGeocode, getFastLocation, checkAndPromptGPSSettings } from '../../utils/permissions';

const AddFruitScreen = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const { hideTabBar, showTabBar } = useTabBarControl();

  // Form state
  const [fruitName, setFruitName] = useState('');
  const [category, setCategory] = useState('banana');
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('10-12');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDescriptionTooltip, setShowDescriptionTooltip] = useState(false);

  // Form validation and UI states
  const [isFormValid, setIsFormValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});

  // Location states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // UI states
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Refs
  const infoIconRef = useRef(null);
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnimY = useRef(new Animated.Value(0)).current;

  const categories = [
    { id: 'banana', name: 'Banana' },
    { id: 'orange', name: 'Orange' },
    { id: 'grape', name: 'Grape' },
    { id: 'pomegranate', name: 'Pomegranate' },
    { id: 'sweet lemon', name: 'Sweet Lemon' },
    { id: 'apple', name: 'Apple' },
    { id: 'mango', name: 'Mango' }
  ];

  const grades = [
    { id: 'A', name: 'Grade A', desc: 'Premium Quality', color: '#00C851' },
    { id: 'B', name: 'Grade B', desc: 'Good Quality', color: '#FF8800' },
    { id: 'C', name: 'Grade C', desc: 'Standard Quality', color: '#FF4444' }
  ];

  const quantities = [
    { id: '1-2', name: '1-2 tons', desc: 'Small batch' },
    { id: '3-5', name: '3-5 tons', desc: 'Medium batch' },
    { id: '6-9', name: '6-9 tons', desc: 'Large batch' },
    { id: '10-12', name: '10-12 tons', desc: 'Very large' },
    { id: '13-15', name: '13-15 tons', desc: 'Bulk order' },
    { id: '16-20', name: '16-20 tons', desc: 'Commercial' },
    { id: '20+', name: '20+ tons', desc: 'Industrial' }
  ];

  // Auto-complete suggestions for common descriptions
  const getDescriptionSuggestion = (category) => {
    const suggestions = {
      banana: "Naturally ripened bananas with perfect sweetness. Rich in nutrients and great for all ages.",
      orange: "Sweet and tangy oranges bursting with vitamin C. Fresh from orchard with vibrant color.",
      grape: "Sweet and juicy grapes with perfect texture. Rich in antioxidants and natural freshness.",
      pomegranate: "Ruby red pomegranates with sweet-tart flavor. Rich in antioxidants and nutrients.",
      "sweet lemon": "Sweet lemons with mild citrus flavor. Rich in vitamin C and perfect for juice.",
      apple: "Crisp and fresh apples with natural sweetness. Premium quality with attractive color and texture.",
      mango: "Fresh, sweet and juicy mangoes. Harvested at perfect ripeness with excellent taste and aroma."
    };
    return suggestions[category] || "";
  };

  // Enhanced scroll to input with keyboard-aware logic
  const scrollToInput = useCallback((inputKey) => {
    const inputRef = inputRefs.current[inputKey];
    if (!inputRef || !scrollViewRef.current) return;
    
    const locationInputs = ['city', 'district', 'state', 'pincode'];
    const isLocationInput = locationInputs.includes(inputKey);
    
    if (isLocationInput) {
      // For location inputs, calculate position based on form structure
      setTimeout(() => {
        const scrollPositions = {
          city: 450,
          district: 450, 
          state: 520,
          pincode: 520
        };
        
        const scrollPosition = scrollPositions[inputKey] || 450;
        
        console.log(`Scrolling to location input ${inputKey} at position:`, scrollPosition);
        
        scrollViewRef.current?.scrollTo({ 
          y: scrollPosition, 
          animated: true 
        });
      }, 250); // Wait for keyboard animation
    } else {
      // For other inputs like description, use measure
      setTimeout(() => {
        if (inputKey === 'description') {
          // Description is at the bottom, scroll near the end
          scrollViewRef.current?.scrollTo({ 
            y: 600, 
            animated: true 
          });
        } else {
          // For top inputs, minimal scroll
          scrollViewRef.current?.scrollTo({ 
            y: 50, 
            animated: true 
          });
        }
      }, 250);
    }
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

    // Clear all errors when user starts typing to allow re-validation
    // This will show the next priority error if current one is fixed
    setValidationErrors({});
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
          fieldName = 'fruit name';
          break;
        case 'description':
          fieldName = 'description';
          break;
        case 'city':
          fieldName = 'city/village';
          break;
        case 'district':
          fieldName = 'district';
          break;
        case 'state':
          fieldName = 'state';
          break;
        case 'pincode':
          fieldName = 'pincode';
          break;
      }
      
      Alert.alert(
        'Please Complete Form',
        `${currentError || `Please fill the ${fieldName} field to continue.`}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user data for farmer_id
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.uid) {
        Alert.alert('Authentication Error', 'Please login to continue');
        setIsSubmitting(false);
        return;
      }

      // Parse quantity range
      const quantityParts = quantity.includes('+')
        ? [parseInt(quantity.replace('+', '')), parseInt(quantity.replace('+', '')) + 5]
        : quantity.split('-').map(q => parseInt(q.trim()));

      // Get selected category object
      const selectedCategory = categories.find(cat => cat.id === category);
      const selectedGrade = grades.find(g => g.id === grade);

      const fruitData = {
        name: fruitName.trim(),
        type: category,
        grade,
        quantity: quantityParts,
        description: description.trim(),
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
        gradeInfo: selectedGrade,
        createdBy: {
          name: user.firstName || 'Farmer',
          uid: user.uid
        }
      };

      console.log('🍎 Fruit data prepared:', fruitData);
      Keyboard.dismiss();

      // Success animation
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to PhotoUpload screen with the fruit data
        navigation.navigate('PhotoUpload', { fruitData });
      });

    } catch (error) {
      console.error('Error preparing fruit data:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
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
        return; // User chose to fill manually or went to settings
      }

      console.log('Getting location with Network/WiFi priority...');
      const location = await getCurrentLocation();

      if (location) {
        setCurrentLocation({ lat: location.latitude, lng: location.longitude });

        // Use fast location method
        const locationData = await getFastLocation(location.latitude, location.longitude);
        if (locationData) {
          console.log('Location data received:', locationData);

          // Always fill city (fallback to district if city is empty)
          const cityToFill = locationData.city || locationData.district || 'Current Area';

          setCity(cityToFill);
          setDistrict(locationData.district || cityToFill);
          setState(locationData.state || 'India');
          setPincode(locationData.pincode || '');

          // Clear any location errors
          setLocationError('');

          // Show success message
          const locationSource = location.source ? ` (${location.source})` : '';
          let dataSource = '';

          switch (locationData.source) {
            case 'google':
              dataSource = ' 🌐 Live data';
              break;
            case 'fallback':
              dataSource = ' - Basic location';
              break;
            default:
              dataSource = '';
          }

          Alert.alert(
            'Location Found!',
            `Auto-filled: ${cityToFill}, ${locationData.district}, ${locationData.state}${locationData.pincode ? ' - ' + locationData.pincode : ''}${locationSource}${dataSource}`,
            [{ text: 'OK' }]
          );
        } else {
          setLocationError('Address details unavailable');
          Alert.alert(
            'Location Found',
            'GPS coordinates obtained but address details unavailable. Please fill manually.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Location error:', error);

      const message = error.userMessage || error.message || 'Unable to get your location. Please fill location details manually.';
      setLocationError(message);

      // Enhanced error handling for different location error types
      if (error.code === 2) {
        // GPS/Location Services are disabled
        Alert.alert(
          'GPS is Off',
          'Please enable GPS/Location Services in your device settings.',
          [
            { text: 'Fill Manually', style: 'cancel' },
            { 
              text: 'Open Settings', 
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
            { text: 'Try Again', onPress: () => handleGetLocation() }
          ]
        );
      } else if (error.code === 1) {
        // Permission denied
        Alert.alert(
          'Location Permission Required',
          'Location permission is required to auto-fill farm location details. Please grant location permission in your device settings.',
          [
            { text: 'Fill Manually', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                Linking.openSettings();
              } 
            },
            { text: 'Try Again', onPress: () => handleGetLocation() }
          ]
        );
      } else {
        // Generic location error
        Alert.alert(
          'Location Error',
          message,
          [
            { text: 'Fill Manually', style: 'cancel' },
            { text: 'Try Again', onPress: () => handleGetLocation() }
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

    // Priority order for validation (show most important first)
    
    // 1. Fruit name validation (highest priority)
    if (!fruitName.trim()) {
      firstError = firstError || { field: 'fruitName', message: 'Fruit name is required' };
      isValid = false;
    } else if (fruitName.trim().length < 2) {
      firstError = firstError || { field: 'fruitName', message: 'Fruit name must be at least 2 characters' };
      isValid = false;
    }

    // 2. Location validation (second priority)
    if (!city.trim()) {
      firstError = firstError || { field: 'city', message: 'City is required' };
      isValid = false;
    }
    if (!district.trim()) {
      firstError = firstError || { field: 'district', message: 'District is required' };
      isValid = false;
    }
    if (!state.trim()) {
      firstError = firstError || { field: 'state', message: 'State is required' };
      isValid = false;
    }
    if (!pincode.trim()) {
      firstError = firstError || { field: 'pincode', message: 'Pincode is required' };
      isValid = false;
    } else if (!/^\d{6}$/.test(pincode.trim())) {
      firstError = firstError || { field: 'pincode', message: 'Please enter a valid 6-digit pincode' };
      isValid = false;
    }

    // 3. Description validation (lowest priority)
    if (!description.trim()) {
      firstError = firstError || { field: 'description', message: 'Description is required' };
      isValid = false;
    } else if (description.trim().length < 20) {
      firstError = firstError || { field: 'description', message: 'Please provide a more detailed description (min 20 characters)' };
      isValid = false;
    }

    // Only show the first error found
    if (firstError) {
      errors[firstError.field] = firstError.message;
    }

    setValidationErrors(errors);
    setIsFormValid(isValid);
    return isValid;
  }, [fruitName, description, city, district, state, pincode]);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const totalFields = 9;
    let filled = 0;

    if (fruitName.trim()) filled++;
    if (category) filled++;
    if (grade) filled++;
    if (quantity) filled++;
    if (description.trim() && description.trim().length >= 20) filled++;
    if (city.trim()) filled++;
    if (district.trim()) filled++;
    if (state.trim()) filled++;
    if (pincode.trim() && /^\d{6}$/.test(pincode.trim())) filled++;

    return (filled / totalFields) * 0.33; // 33% of total journey
  }, [fruitName, category, grade, quantity, description, city, district, state, pincode]);

  // Form validation effect
  useEffect(() => {
    validateForm();
    const newProgress = calculateProgress();
    setProgress(newProgress);
  }, [validateForm, calculateProgress]);

  // Progress animation effect
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, slideAnim]);

  // Keyboard handling with improved logic
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // For Android, move button above keyboard
        // For iOS, use a smaller offset since the system handles it better
        const offset = Platform.OS === 'android' ? -e.endCoordinates.height : -50;
        Animated.timing(buttonAnimY, {
          toValue: offset,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        // Animate button back to original position
        Animated.timing(buttonAnimY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [buttonAnimY]);

  // Auto-suggest description based on category

  // ## Temperary Disabled But may be it need in future

  // useEffect(() => {
  //   if (category && !description.trim()) {
  //     const suggestion = getDescriptionSuggestion(category);
  //     if (suggestion) {
  //       setDescription(suggestion);
  //     }
  //   }
  // }, [category, description]);

  // Hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showCategoryModal || showGradeModal || showQuantityModal || showDescriptionTooltip) {
        setShowCategoryModal(false);
        setShowGradeModal(false);
        setShowQuantityModal(false);
        setShowDescriptionTooltip(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showCategoryModal, showGradeModal, showQuantityModal, showDescriptionTooltip]);

  // Enhanced tooltip handler with better positioning
  const handleTooltipPress = useCallback(() => {
    infoIconRef.current?.measure((fx, fy, width, height, px, py) => {
      const tooltipX = Math.max(20, Math.min(px - 140, screenWidth - 300));
      const tooltipY = Math.max(100, py - 80);
      setTooltipPosition({ x: tooltipX, y: tooltipY });
      setShowDescriptionTooltip(true);
    });
  }, [screenWidth]);

  // Enhanced modal close handlers
  const closeModal = useCallback((modalType) => {
    switch (modalType) {
      case 'category':
        setShowCategoryModal(false);
        break;
      case 'grade':
        setShowGradeModal(false);
        break;
      case 'quantity':
        setShowQuantityModal(false);
        break;
      case 'tooltip':
        setShowDescriptionTooltip(false);
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
        translucent={false}
        barStyle="dark-content"
      />
      <View style={styles.container}>
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add Fruit Listing</Text>
            <Text style={styles.headerSubtitle}>Step 1 of 3</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleGetLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#00C851" />
              ) : (
                <MaterialIcons name="my-location" size={20} color="#00C851" />
              )}
            </TouchableOpacity>
          </View>
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
            {Math.round(progress * 100)}% Complete
            {!isFormValid && (() => {
              const currentField = Object.keys(validationErrors)[0];
              if (currentField) {
                let fieldName = currentField;
                switch (currentField) {
                  case 'fruitName':
                    fieldName = 'fruit name';
                    break;
                  case 'description':
                    fieldName = 'description';
                    break;
                  case 'city':
                    fieldName = 'city/village';
                    break;
                  case 'district':
                    fieldName = 'district';
                    break;
                  case 'state':
                    fieldName = 'state';
                    break;
                  case 'pincode':
                    fieldName = 'pincode';
                    break;
                }
                return ` • Next: ${fieldName}`;
              }
              return '';
            })()}
          </Text>
        </View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? 180 : 120 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            <View style={styles.content}>
              {/* Fruit Name Input */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="leaf-outline" size={16} color="#00C851" /> Fruit Name *
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
                  placeholder="e.g. Alphonso Mango, Fuji Apple"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => inputRefs.current.description?.focus()}
                />
                {(showValidationErrors || touchedFields.fruitName) && validationErrors.fruitName && (
                  <Text style={styles.errorText}>{validationErrors.fruitName}</Text>
                )}
              </View>

              {/* Category Selection */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="apps-outline" size={16} color="#00C851" /> Category *
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowCategoryModal(true)}
                  accessible={true}
                  accessibilityLabel="Select fruit category"
                  accessibilityHint="Opens category selection modal"
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
              <View style={styles.modernInputContainer}>
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
              </View>

              {/* Quantity Selection */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="scale-outline" size={16} color="#00C851" /> Available Quantity *
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowQuantityModal(true)}
                  accessible={true}
                  accessibilityLabel="Select available quantity"
                  accessibilityHint="Opens quantity selection modal"
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.quantityIcon}>⚖️</Text>
                    <Text style={styles.modernDropdownText}>
                      {quantities.find(q => q.id === quantity)?.name || `${quantity} tons`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Location Section */}
              <View style={styles.modernSectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.modernSectionTitle}>
                    <Ionicons name="location-outline" size={18} color="#00C851" /> Farm Location *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.singleLocationButton,
                      isGettingLocation && styles.locationButtonDisabled
                    ]}
                    onPress={handleGetLocation}
                    disabled={isGettingLocation}
                    accessible={true}
                    accessibilityLabel="Get current location"
                    accessibilityHint="Automatically fills location fields using GPS"
                  >
                    {isGettingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="my-location" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.locationButtonText}>
                      {isGettingLocation ? 'Getting...' : 'Get Location'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.locationHelpText}>
                  📍 Auto-fill your farm location using GPS and Google Maps
                </Text>

                {locationError ? (
                  <Text style={styles.locationErrorText}>
                    ⚠️ {locationError}
                  </Text>
                ) : null}

                <View style={styles.locationGrid}>
                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>City/Village *</Text>
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
                      placeholder="City name"
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
                    <Text style={styles.modernLabel}>District *</Text>
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
                      placeholder="District"
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
                    <Text style={styles.modernLabel}>State *</Text>
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
                      placeholder="State"
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
                    <Text style={styles.modernLabel}>Pincode *</Text>
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
                      placeholder="123456"
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
                <View style={styles.descriptionHeader}>
                  <Text style={styles.modernLabel}>
                    <Ionicons name="document-text-outline" size={16} color="#00C851" /> Description *
                    <Text style={styles.characterCount}>
                      ({description.length}/20 chars)
                    </Text>
                  </Text>
                  <TouchableOpacity
                    ref={infoIconRef}
                    style={styles.infoButton}
                    onPress={handleTooltipPress}
                    accessible={true}
                    accessibilityLabel="Description help"
                    accessibilityHint="Shows tips for writing a good description"
                  >
                    <Ionicons name="help-circle-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={[
                  styles.modernDescriptionContainer,
                  focusedInput === 'description' && styles.modernInputFocused,
                  (showValidationErrors || touchedFields.description) && validationErrors.description && styles.modernInputError
                ]}>
                  <TextInput
                    ref={(ref) => inputRefs.current.description = ref}
                    style={styles.modernDescriptionInput}
                    value={description}
                    onChangeText={(value) => handleInputChange('description', value)}
                    onFocus={() => handleInputFocus('description')}
                    onBlur={() => setFocusedInput('')}
                    placeholder="Describe your fruit quality, taste, harvesting details..."
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                </View>
                {(showValidationErrors || touchedFields.description) && validationErrors.description && (
                  <Text style={styles.errorText}>{validationErrors.description}</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Modern Continue Button */}
        <Animated.View style={[
          styles.modernButtonContainer,
          {
            transform: [{ translateY: buttonAnimY }]
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.modernContinueButton,
              (!isFormValid || isSubmitting) && styles.modernButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isFormValid || isSubmitting}
            accessible={true}
            accessibilityLabel={isFormValid ? "Continue to photos" : "Form incomplete"}
            accessibilityHint={isFormValid ? "Proceeds to photo upload screen" : "Complete all required fields first"}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonIcon} />
            ) : (
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
            )}
            <Text style={styles.modernButtonText}>
              {isSubmitting ? 'Processing...' : 'Continue to Photos'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.buttonHelpText}>
            {isFormValid
              ? "All details look good! Let's add some photos"
              : (() => {
                  const currentError = Object.values(validationErrors)[0];
                  const currentField = Object.keys(validationErrors)[0];
                  
                  if (currentError && currentField) {
                    let fieldName = currentField;
                    switch (currentField) {
                      case 'fruitName':
                        fieldName = 'fruit name';
                        break;
                      case 'description':
                        fieldName = 'description';
                        break;
                      case 'city':
                        fieldName = 'city/village';
                        break;
                      case 'district':
                        fieldName = 'district';
                        break;
                      case 'state':
                        fieldName = 'state';
                        break;
                      case 'pincode':
                        fieldName = 'pincode';
                        break;
                    }
                    return `Please complete: ${fieldName}`;
                  }
                  return "Please fill all required fields to continue";
                })()
            }
          </Text>
        </Animated.View>

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
                <Text style={styles.modernModalTitle}>Select Category</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => closeModal('category')}
                  accessible={true}
                  accessibilityLabel="Close modal"
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
                    accessibilityLabel={`Select ${cat.name}`}
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

        {/* Modern Grade Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showGradeModal}
          onRequestClose={() => closeModal('grade')}
        >
          <Pressable
            style={styles.modernModalOverlay}
            onPress={() => closeModal('grade')}
          >
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>Select Quality Grade</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => closeModal('grade')}
                  accessible={true}
                  accessibilityLabel="Close modal"
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {grades.map((gradeOption, index) => (
                  <TouchableOpacity
                    key={gradeOption.id}
                    style={[
                      styles.modernModalOption,
                      grade === gradeOption.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setGrade(gradeOption.id);
                      closeModal('grade');
                    }}
                    accessible={true}
                    accessibilityLabel={`Select ${gradeOption.name} - ${gradeOption.desc}`}
                    accessibilityRole="button"
                  >
                    <View style={[
                      styles.gradeIndicatorLarge,
                      { backgroundColor: gradeOption.color }
                    ]} />
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.modernOptionText,
                        grade === gradeOption.id && styles.modernSelectedText
                      ]}>
                        {gradeOption.name}
                      </Text>
                      <Text style={styles.optionSubText}>{gradeOption.desc}</Text>
                    </View>
                    {grade === gradeOption.id && (
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
                <Text style={styles.modernModalTitle}>Select Quantity</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => closeModal('quantity')}
                  accessible={true}
                  accessibilityLabel="Close modal"
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
                    accessibilityLabel={`Select ${qty.name} - ${qty.desc}`}
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

        {/* Modern Description Tooltip */}
        <Modal
          transparent
          animationType="fade"
          visible={showDescriptionTooltip}
          onRequestClose={() => closeModal('tooltip')}
        >
          <TouchableOpacity
            style={styles.modernTooltipOverlay}
            onPress={() => closeModal('tooltip')}
            activeOpacity={1}
            accessible={true}
            accessibilityLabel="Close tooltip"
          >
            <View
              style={[
                styles.modernTooltipBox,
                {
                  position: 'absolute',
                  top: tooltipPosition.y,
                  left: tooltipPosition.x,
                }
              ]}
            >
              <Text style={styles.modernTooltipText}>
                💡 Add details about taste, color, size, harvest date, and special qualities to attract more buyers!
              </Text>
            </View>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
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
  locationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 60, // Minimal padding since tab bar is hidden
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 4,
    fontSize: 16,
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernInputFocused: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  modernDropdownContainer: {
    marginBottom: 24,
  },
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
  modernDropdownIcon: {
    marginRight: 12,
  },
  modernDropdownText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  modernDropdownChevron: {
    marginLeft: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshLocationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  locationHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  halfWidth: {
    flex: 1,
    minWidth: Dimensions.get('window').width / 2.3,
  },

  // Dropdown Content Styles
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  gradeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  quantityIcon: {
    fontSize: 18,
    marginRight: 12,
  },

  // Description Header Styles
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  modernDescriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernDescriptionInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Modern Button Styles
  modernButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20, // Will be dynamically adjusted
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modernContinueButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonHelpText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
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
    minHeight: '50%',
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
  categoryEmojiLarge: {
    fontSize: 20,
    marginRight: 16,
  },
  gradeIndicatorLarge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
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

  // Modern Tooltip Styles
  modernTooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modernTooltipBox: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modernTooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default AddFruitScreen;
