// File: src/components/AddFruitScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTabBarControl } from '../../utils/navigationControls';
import { getCurrentLocation, reverseGeocode, getFastLocation } from '../../utils/permissions';

const AddFruitScreen = ({ navigation }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const { hideTabBar, showTabBar } = useTabBarControl();
  const [fruitName, setFruitName] = useState('');
  const [category, setCategory] = useState('mango');
  const [grade, setGrade] = useState('A');
  const [quantity, setQuantity] = useState('10-12');
  const [description, setDescription] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [showDescriptionTooltip, setShowDescriptionTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastLocationData, setLastLocationData] = useState(null); // Cache location data in state
  const infoIconRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const scrollViewRef = useRef(null);

  const categories = [
    { id: 'mango', name: 'Mango', icon: '🥭', color: '#FFD700' },
    { id: 'apple', name: 'Apple', icon: '🍎', color: '#FF6B6B' },
    { id: 'banana', name: 'Banana', icon: '🍌', color: '#FFE135' },
    { id: 'orange', name: 'Orange', icon: '🍊', color: '#FF8C00' },
    { id: 'grapes', name: 'Grapes', icon: '🍇', color: '#9370DB' },
    { id: 'pomegranate', name: 'Pomegranate', icon: '🍇', color: '#DC143C' },
    { id: 'guava', name: 'Guava', icon: '🍐', color: '#90EE90' },
    { id: 'papaya', name: 'Papaya', icon: '🧡', color: '#FFA500' }
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
      mango: "Fresh, sweet and juicy mangoes. Harvested at perfect ripeness with excellent taste and aroma.",
      apple: "Crisp and fresh apples with natural sweetness. Premium quality with attractive color and texture.",
      banana: "Naturally ripened bananas with perfect sweetness. Rich in nutrients and great for all ages.",
      orange: "Sweet and tangy oranges bursting with vitamin C. Fresh from orchard with vibrant color.",
      grapes: "Sweet and juicy grapes with perfect texture. Seedless variety with natural freshness.",
      pomegranate: "Ruby red pomegranates with sweet-tart flavor. Rich in antioxidants and nutrients.",
      guava: "Aromatic guavas with sweet flesh. Rich in vitamin C and perfect for fresh consumption.",
      papaya: "Sweet and soft papayas with orange flesh. Natural enzymes and rich tropical flavor."
    };
    return suggestions[category] || "";
  };

  // Validate form whenever inputs change
  React.useEffect(() => {
    const isValid = fruitName.trim() &&
      category &&
      grade &&
      quantity &&
      description.trim() &&
      village.trim() &&
      district.trim() &&
      state.trim() &&
      pincode.trim();
    setIsFormValid(isValid);
  }, [fruitName, category, grade, quantity, description, village, district, state, pincode]);

  React.useEffect(() => {
    const totalFields = 9;
    let filled = 0;

    if (fruitName.trim()) filled++;
    if (category) filled++;
    if (grade) filled++;
    if (quantity) filled++;
    if (description.trim()) filled++;
    if (village.trim()) filled++;
    if (district.trim()) filled++;
    if (state.trim()) filled++;
    if (pincode.trim()) filled++;

    const newProgress = (filled / totalFields) * 0.33; // 33% of total journey
    setProgress(newProgress);

    // Animate progress bar
    Animated.timing(slideAnim, {
      toValue: newProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fruitName, category, grade, quantity, description, village, district, state, pincode]);


  const handleContinue = async () => {
    if (isFormValid) {
      try {
        // Get current user data for farmer_id
        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;

        if (!user || !user.uid) {
          Alert.alert('Error', 'Please login to continue');
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
            village: village.trim(),
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
      }
    }
  };

  const handleBack = () => {
    showTabBar(); // Ensure tab bar is visible when going back
    navigation.goBack();
  };

  // Single location handling - fast with Network/WiFi priority, smart caching
  const handleGetLocation = async () => {
    setIsGettingLocation(true);

    try {
      console.log('Getting location with Network/WiFi priority and caching...');
      const location = await getCurrentLocation();

      if (location) {
        setCurrentLocation({ lat: location.latitude, lng: location.longitude });

        // Use fast location method with caching
        const locationData = await getFastLocation(location.latitude, location.longitude);
        if (locationData) {
          console.log('Location data received:', locationData);

          // Store in state cache for immediate re-use
          setLastLocationData({
            ...locationData,
            coordinates: { lat: location.latitude, lng: location.longitude },
            timestamp: Date.now()
          });

          // Always fill village (fallback to district if village is empty)
          const villageToFill = locationData.village || locationData.district || 'Current Area';

          setVillage(villageToFill);
          setDistrict(locationData.district || villageToFill);
          setState(locationData.state || 'India');
          setPincode(locationData.pincode || '');

          // Show different messages based on location and data source
          const locationSource = location.source ? ` (${location.source})` : '';
          let dataSource = '';

          switch (locationData.source) {
            case 'cache':
              dataSource = ' ⚡ Cached data';
              break;
            case 'google':
              dataSource = ' 🌐 Live data';
              break;
            case 'fallback':
              dataSource = ' - Basic location';
              break;
            default:
              dataSource = '';
          }

          console.log(
            'Location Found!',
            `Auto-filled: ${villageToFill}, ${locationData.district}, ${locationData.state}${locationData.pincode ? ' - ' + locationData.pincode : ''}${locationSource}${dataSource}`,
            [{ text: 'OK' }]
          );
        } else {
          // This shouldn't happen with the new fallback system, but just in case
          Alert.alert(
            'Location Found',
            'GPS coordinates obtained but address details unavailable. Please fill manually.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Location error:', error);

      // Use user-friendly message if available
      const message = error.userMessage || error.message || 'Unable to get your location. Please fill location details manually.';

      // Show error alert with option to try again or fill manually
      Alert.alert(
        'Location Error',
        message,
        [
          { text: 'Fill Manually', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleGetLocation() }
        ]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Auto-suggest description based on category
  useEffect(() => {
    if (category && !description.trim()) {
      const suggestion = getDescriptionSuggestion(category);
      if (suggestion) {
        setDescription(suggestion);
      }
    }
  }, [category]);

  // Note: Removed automatic location initialization to avoid unwanted permission requests
  // Location will only be requested when user taps the GPS button

  // Progress animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, slideAnim]);

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
        backgroundColor="transparent"
        translucent={true}
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
          </Text>
        </View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
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
                  <Ionicons name="leaf-outline" size={16} color="#00C851" /> Fruit Name
                </Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    focusedInput === 'fruitName' && styles.modernInputFocused
                  ]}
                  value={fruitName}
                  onChangeText={setFruitName}
                  onFocus={() => setFocusedInput('fruitName')}
                  onBlur={() => setFocusedInput('')}
                  placeholder="e.g. Alphonso Mango, Fuji Apple"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Category Selection */}
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernLabel}>
                  <Ionicons name="apps-outline" size={16} color="#00C851" /> Category
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.categoryEmoji}>
                      {categories.find(cat => cat.id === category)?.icon || '🍎'}
                    </Text>
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
                  <Ionicons name="star-outline" size={16} color="#00C851" /> Quality Grade
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowGradeModal(true)}
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
                  <Ionicons name="scale-outline" size={16} color="#00C851" /> Available Quantity
                </Text>
                <TouchableOpacity
                  style={styles.modernDropdown}
                  onPress={() => setShowQuantityModal(true)}
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
                    <Ionicons name="location-outline" size={18} color="#00C851" /> Farm Location
                  </Text>
                  <TouchableOpacity
                    style={styles.singleLocationButton}
                    onPress={handleGetLocation}
                    disabled={isGettingLocation}
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

                <View style={styles.locationGrid}>
                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>Village</Text>
                    <TextInput
                      style={[
                        styles.modernInput,
                        focusedInput === 'village' && styles.modernInputFocused
                      ]}
                      value={village}
                      onChangeText={setVillage}
                      onFocus={() => setFocusedInput('village')}
                      onBlur={() => setFocusedInput('')}
                      placeholder="Village name"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>District</Text>
                    <TextInput
                      style={[
                        styles.modernInput,
                        focusedInput === 'district' && styles.modernInputFocused
                      ]}
                      value={district}
                      onChangeText={setDistrict}
                      onFocus={() => setFocusedInput('district')}
                      onBlur={() => setFocusedInput('')}
                      placeholder="District"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.locationGrid}>
                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>State</Text>
                    <TextInput
                      style={[
                        styles.modernInput,
                        focusedInput === 'state' && styles.modernInputFocused
                      ]}
                      value={state}
                      onChangeText={setState}
                      onFocus={() => setFocusedInput('state')}
                      onBlur={() => setFocusedInput('')}
                      placeholder="State"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={[styles.modernInputContainer, styles.halfWidth]}>
                    <Text style={styles.modernLabel}>Pincode</Text>
                    <TextInput
                      style={[
                        styles.modernInput,
                        focusedInput === 'pincode' && styles.modernInputFocused
                      ]}
                      value={pincode}
                      onChangeText={setPincode}
                      onFocus={() => setFocusedInput('pincode')}
                      onBlur={() => setFocusedInput('')}
                      placeholder="123456"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={6}
                      returnKeyType="next"
                    />
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.modernInputContainer}>
                <View style={styles.descriptionHeader}>
                  <Text style={styles.modernLabel}>
                    <Ionicons name="document-text-outline" size={16} color="#00C851" /> Description
                  </Text>
                  <TouchableOpacity
                    ref={infoIconRef}
                    style={styles.infoButton}
                    onPress={() => {
                      infoIconRef.current.measure((fx, fy, width, height, px, py) => {
                        setTooltipPosition({ x: px, y: py });
                        setShowDescriptionTooltip(true);
                      });
                    }}
                  >
                    <Ionicons name="help-circle-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={[
                  styles.modernDescriptionContainer,
                  focusedInput === 'description' && styles.modernInputFocused
                ]}>
                  <TextInput
                    style={styles.modernDescriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setFocusedInput('description')}
                    onBlur={() => setFocusedInput('')}
                    placeholder="Describe your fruit quality, taste, harvesting details..."
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Modern Continue Button */}
        <View style={styles.modernButtonContainer}>
          <TouchableOpacity
            style={[
              styles.modernContinueButton,
              !isFormValid && styles.modernButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isFormValid}
          >
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
            <Text style={styles.modernButtonText}>Continue to Photos</Text>
          </TouchableOpacity>

          <Text style={styles.buttonHelpText}>
            {isFormValid
              ? "All details look good! Let's add some photos"
              : "Please fill all required fields to continue"
            }
          </Text>
        </View>

        {/* Modern Category Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showCategoryModal}
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modernModalOverlay}>
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>Select Category</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modernModalOption,
                      category === cat.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setCategory(cat.id);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.categoryEmojiLarge}>{cat.icon}</Text>
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
          </View>
        </Modal>

        {/* Modern Grade Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showGradeModal}
          onRequestClose={() => setShowGradeModal(false)}
        >
          <View style={styles.modernModalOverlay}>
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>Select Quality Grade</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => setShowGradeModal(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {grades.map((gradeOption, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modernModalOption,
                      grade === gradeOption.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setGrade(gradeOption.id);
                      setShowGradeModal(false);
                    }}
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
          </View>
        </Modal>

        {/* Modern Quantity Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={showQuantityModal}
          onRequestClose={() => setShowQuantityModal(false)}
        >
          <View style={styles.modernModalOverlay}>
            <View style={styles.modernModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modernModalTitle}>Select Quantity</Text>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => setShowQuantityModal(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {quantities.map((qty, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modernModalOption,
                      quantity === qty.id && styles.modernSelectedOption
                    ]}
                    onPress={() => {
                      setQuantity(qty.id);
                      setShowQuantityModal(false);
                    }}
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
          </View>
        </Modal>

        {/* Modern Description Tooltip */}
        <Modal
          transparent
          animationType="fade"
          visible={showDescriptionTooltip}
          onRequestClose={() => setShowDescriptionTooltip(false)}
        >
          <TouchableOpacity
            style={styles.modernTooltipOverlay}
            onPressOut={() => setShowDescriptionTooltip(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.modernTooltipBox,
                {
                  position: 'absolute',
                  top: tooltipPosition.y - 80,
                  left: Math.max(20, Math.min(tooltipPosition.x - 140, screenWidth - 300)),
                }
              ]}
            >
              <Text style={styles.modernTooltipText}>
                💡 Add details about taste, color, size, harvest date, and special qualities to attract more buyers!
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
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
    width: '50%',
    paddingHorizontal: 6,
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
    bottom: -60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12, // Minimal padding since tab bar is hidden
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
