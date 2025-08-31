import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ScrollView,
  Animated,
  TextInput,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants';
import { createFruit } from '../../services/fruitService';
import { useTabBarControl } from '../../utils/navigationControls';
import { useFocusEffect } from '@react-navigation/native';

// Simple smart pricing - keep complex logic hidden
const getSmartPrice = (fruitCategory, variety) => {
  const basePrices = {
    mango: { alphonso: 45, kesar: 38, totapuri: 25, langra: 22 },
    apple: { kashmiri: 120, shimla: 85, kinnaur: 95 }
  };

  const category = basePrices[fruitCategory] || basePrices.mango;
  const basePrice = category[variety] || Object.values(category)[0] || 30;

  // Apply market factors quietly in background (farmers don't need to see this complexity)
  const marketPrice = Math.round(basePrice * 0.92 * 100) / 100; // Simplified calculation

  return {
    recommended: marketPrice,
    min: Math.round(marketPrice * 0.85),
    max: Math.round(marketPrice * 1.25)
  };
};

// Price validation function
const validatePrice = (price) => {
  const numPrice = parseFloat(price);

  // Check for invalid inputs
  if (isNaN(numPrice) || numPrice < 0) {
    return { isValid: false, message: 'Please enter a valid price.' };
  }

  // Check minimum price
  if (numPrice < 10) {
    return { isValid: false, message: 'Minimum price is ₹10/kg.' };
  }

  // Check maximum price
  if (numPrice > 200) {
    return { isValid: false, message: 'Maximum price is ₹200/kg.' };
  }

  return { isValid: true, message: '' };
};

export default function PriceSelectionScreen({ navigation, route }) {
  const { hideTabBar, showTabBar } = useTabBarControl();
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHint, setIsHint] = useState(false);
  const [priceError, setPriceError] = useState('');
  const timeoutRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;


  // Get product data from previous screen
  const { productData } = route.params || {};

  // Extract fruit info
  const fruitCategory = (productData?.type || 'mango').toLowerCase();
  const fruitQuantity = productData?.quantity;
  const fruitPhoto = productData?.image_urls?.[0];
  const fruitName = productData?.name || '';
  const fruitVariety = fruitName.toLowerCase().includes('alphonso') ? 'alphonso' :
    fruitName.toLowerCase().includes('kesar') ? 'kesar' : 'totapuri';

  const smartPricing = getSmartPrice(fruitCategory, fruitVariety);

  const handlePress = () => {
    if (timeoutRef.current) return; // Prevent rapid re-clicks
    setIsHint(true);
    // Optional animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      setIsHint(false);
      timeoutRef.current = null;
    }, 800);
  };

  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Simple loading simulation
    console.log('PriceSelection: Loading started');
    setTimeout(() => {
      console.log('PriceSelection: Loading completed, showing content');
      setIsLoading(false);
      setSelectedPrice(smartPricing.recommended); // Auto-select recommended price
      setCustomPrice(smartPricing.recommended.toString()); // Sync custom input
    }, 800); // Reduced loading time
  }, [smartPricing.recommended]);

  // Tab bar control - hide when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      hideTabBar();

      // Show tab bar when leaving screen
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );

  const handleBack = () => {
    showTabBar(); // Ensure tab bar is shown when going back
    navigation.goBack();
  };

  const handlePriceSelect = (price) => {
    const validation = validatePrice(price);
    if (validation.isValid) {
      setSelectedPrice(price);
      setCustomPrice(price.toString()); // Sync with custom input
      setShowCustomInput(false);
      setPriceError('');
    } else {
      setPriceError(validation.message);
    }
  };

  const handleCustomPrice = () => {
    setShowCustomInput(true);
    // Don't clear selectedPrice here to maintain sync
  };

  const handleCustomPriceChange = (value) => {
    setCustomPrice(value);
    setPriceError(''); // Clear error when user starts typing

    if (value && !isNaN(parseFloat(value))) {
      const validation = validatePrice(value);
      if (validation.isValid) {
        setSelectedPrice(parseFloat(value));
      } else {
        setPriceError(validation.message);
        setSelectedPrice(null);
      }
    } else if (!value) {
      // If input is cleared, reset to null
      setSelectedPrice(null);
      setCustomPrice('');
    }
  };

  const handleContinue = async () => {
    const finalPrice = selectedPrice;

    // Validate price before proceeding
    if (!finalPrice) {
      Alert.alert('Please select a price', 'Please select a price for your fruit.');
      return;
    }

    const validation = validatePrice(finalPrice);
    if (!validation.isValid) {
      Alert.alert('Invalid price', validation.message);
      return;
    }

    try {
      // Show loading state
      setIsLoading(true);

      // Get current user data for farmer_id
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : {};
      console.log("Data from AsyncStorage:", productData, user);

      // Prepare final fruit data according to Fruit schema
      const finalFruitData = {
        // Basic fruit info
        name: productData?.name || '',
        type: productData?.type || '',
        // grade: productData?.grade || 'A',
        description: productData?.description || '',

        // Quantity and pricing
        quantity: productData?.quantity || [0, 0],
        price_per_kg: finalPrice,

        // Availability and images - using Firebase URLs directly
        availability_date: new Date().toISOString(),
        image_urls: productData?.image_urls || [], // Already Firebase URLs from PhotoUploadScreen

        // Location info
        location: {
          city: productData?.location?.city || '',
          district: productData?.location?.district || '',
          state: productData?.location?.state || '',
          pincode: productData?.location?.pincode || '',
          lat: productData?.location?.lat || 0,
          lng: productData?.location?.lng || 0
        },

        // User reference
        farmer_id: user.uid || 'anonymous',

        // Status and metadata
        status: 'active',
        views: 0,
        likes: 0
      };

      console.log('📝 Final fruit data prepared:', finalFruitData);

      // Save to Firebase (create fruit listing) - pass empty array for imageUris since we have Firebase URLs
      const fruitId = await createFruit(finalFruitData, []);

      console.log('✅ Fruit listing created with ID:', fruitId);

      // Success message
      Alert.alert(
        '🎉 Success!',
        `Your ${productData?.name} has been listed at ₹${finalPrice}/kg!`,
        [{
          text: 'Great!',
          onPress: () => {
            // Navigate back to farmer home and refresh
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }
        }]
      );
    } catch (error) {
      console.error('❌ Error creating fruit listing:', error);
      Alert.alert(
        'Error',
        'Failed to create fruit listing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Simple loading screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <MaterialCommunityIcons name="leaf" size={56} color="#4CAF50" />
            <Text style={styles.loadingTitle}>Fetching market info...</Text>
            <Text style={styles.loadingSubtitle}>Getting best price for you</Text>

            <View style={styles.loadingBar}>
              <View style={styles.loadingProgress} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Set Your Price</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Fruit Card*/}
        <TouchableOpacity
          style={styles.fruitCard}
          activeOpacity={0.9}
        >
          <Image source={{ uri: fruitPhoto }} style={styles.fruitImage} />

          <View style={styles.fruitDetailsSection}>
            <Text style={styles.fruitName}>{fruitName}</Text>
            <Text style={styles.fruitCategory}>Category: {fruitCategory}</Text>

            <View style={styles.locationRow}>
              <Icon name="location-outline" size={12} color="#505050" />
              <Text style={styles.fruitLocation}>
                {[
                  productData?.location?.city,
                  productData?.location?.district,
                ]
                  .filter(val => val && val.trim())
                  .join(", ")}
              </Text>

            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.fruitPrice}>₹{selectedPrice || smartPricing.recommended}/kg</Text>
            {/* <Text style={styles.fruitTons}>
              {fruitQuantity ? `${fruitQuantity[0]}-${fruitQuantity[1]} tons` : 'Grade ' + productData?.grade}
            </Text> */}
          </View>
        </TouchableOpacity>

        {/* Custom Price Input */}
        <View style={styles.customInputCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.customInputTitle}>Enter Price</Text>
            <TouchableOpacity onPress={handlePress} style={styles.button}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={isHint ? 'information-circle' : 'information-circle-outline'}
                  size={24}
                  color={isHint ? '#2980B9' : '#2C3E50'}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.customInput}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.customTextInput}
              value={customPrice}
              onChangeText={handleCustomPriceChange}
              keyboardType="numeric"
              placeholder="Enter price"
              placeholderTextColor="#999"
              autoFocus
            />
            <Text style={styles.unitLabel}>/kg</Text>
          </View>

          <View style={styles.priceOptionsRow}>
            <Text style={styles.priceLabel}>Price: </Text>
            <TouchableOpacity
              style={[styles.priceChip, selectedPrice === Math.round(smartPricing.recommended * 0.95) && styles.selectedChip]}
              onPress={() => handlePriceSelect(Math.round(smartPricing.recommended * 0.95))}
            >
              <Text style={styles.chipText}>₹{Math.round(smartPricing.recommended * 0.95)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.priceChip, selectedPrice === smartPricing.recommended && styles.selectedChip]}
              onPress={() => handlePriceSelect(smartPricing.recommended)}
            >
              <Text style={styles.chipText}>₹{smartPricing.recommended}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.priceChip, selectedPrice === Math.round(smartPricing.recommended * 1.1) && styles.selectedChip]}
              onPress={() => handlePriceSelect(Math.round(smartPricing.recommended * 1.1))}
            >
              <Text style={styles.chipText}>₹{Math.round(smartPricing.recommended * 1.1)}</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {priceError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{priceError}</Text>
            </View>
          ) : null}

          {/* Simple Help Text */}
          {isHint && !priceError && <Text style={styles.helpText}>
            Tip: Enter a price that reflects the current market value.
          </Text>}
        </View>

        {/* Simple Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { opacity: selectedPrice ? 1 : 0.5 }]}
          onPress={handleContinue}
          disabled={!selectedPrice}
        >
          <MaterialCommunityIcons name="check-circle" size={24} color="white" />
          <Text style={styles.continueText}>Finish</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Simple Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
    paddingBottom: 10,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  headerSpacer: {
    width: 40, // Same width as backButton to center the title
  },

  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 20,
  },



  // Price Options Row
  priceLabel: {
    fontWeight: '500',
    marginRight: 10,
    fontSize: 16,
    color: '#2C3E50',
  },

  priceOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    justifyContent: 'center',
    gap: 16,
  },
  priceChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  selectedChip: {
    backgroundColor: '#E8F5E8',
    borderColor: '#27AE60',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },



  // Custom Input Card
  customInputCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  customInputTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  button: {
    padding: 4,
    borderRadius: 12,
  },
  customHint: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'right',
    marginBottom: 4,
  },
  customInputSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Fruit Card
  fruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  fruitImage: {
    height: 74,
    width: 74,
    borderRadius: 10,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fruitDetailsSection: {
    flex: 1,
    paddingRight: 10,
  },
  fruitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fruitCategory: {
    fontSize: 13,
    color: '#939393',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fruitLocation: {
    fontSize: 12,
    color: '#505050',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  fruitPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fruitTons: {
    fontSize: 12,
    color: '#939393',
    marginTop: 2,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },


  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  rupeeSymbol: {
    fontSize: 26,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 8,
  },
  customTextInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 8,
  },

  // Custom Input Card
  customInputCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  // Continue Button
  continueButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
    elevation: 3,
  },
  continueText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Help Text
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    paddingHorizontal: 10,
  },

  // Error Message
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 8,
    width: '100%',
    maxWidth: 300,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginTop: 24,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
});
