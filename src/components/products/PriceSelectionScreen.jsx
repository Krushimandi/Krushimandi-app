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
  Dimensions,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

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

// Price Gauge Component
const PriceGauge = ({ currentPrice, minPrice, maxPrice, recommendedPrice }) => {
  const { width } = Dimensions.get('window');
  const gaugeSize = width * 0.85; // Larger gauge
  const radius = gaugeSize / 2 - 30;
  const centerX = gaugeSize / 2;
  const centerY = gaugeSize / 2; // Center for semi-circle

  // Calculate angle for current price
  const realisticMin = minPrice * 0.9;  // 10% below min is considered unrealistically low
  const realisticMax = maxPrice * 1.1;  // 10% above max is considered unrealistically high

  let priceRatio = (currentPrice - realisticMin) / (realisticMax - realisticMin);
  priceRatio = Math.max(0, Math.min(1, priceRatio));  // Clamp between 0 and 1

  const angle = 180 - (priceRatio * 180); // 180° left to 0° right


  // Get color and status based on price position
  const getPriceStatus = () => {
    if (priceRatio < 0.33) {
      return {
        color: '#FF6B6B',
        status: 'Too Low',
        chance: 'High chance to sell but low profit',
        bgColor: '#FFE5E5'
      };
    }

    if (priceRatio >= 0.33 && priceRatio < 0.66) {
      return {
        color: '#6BCF7F',
        status: 'Good Price',
        chance: 'Good visibility and fair price',
        bgColor: '#E8F5E9'
      };
    }

    if (priceRatio >= 0.66 && priceRatio <= 1) {
      return {
        color: '#FFD93D',
        status: 'Balanced',
        chance: 'Optimal price with buyer interest',
        bgColor: '#FFFDE7'
      };
    }

    // Fallback
    return {
      color: '#C62828',
      status: 'Unrealistic',
      chance: 'Check again',
      bgColor: '#FFEBEE'
    };
  };


  const { color, status, chance, bgColor } = getPriceStatus();

  // Create improved arc paths for a proper semi-circle
  const createArcPath = (startAngle, endAngle) => {
    // Convert to radians and adjust for SVG coordinate system
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Calculate needle position (0° = left, 180° = right in our coordinate system)
  const needleAngle = -angle;
  const needleLength = radius - 15;

  return (
    <View style={styles.gaugeContainer}>
      {/* Main price display at the top */}
      <View style={styles.priceDisplayTop}>
        <Text style={styles.currentPriceTextLarge}>₹{currentPrice.toFixed(2)}</Text>
      </View>

      <Svg width={gaugeSize} height={gaugeSize * 0.6} style={styles.gaugeSvg}>
        {/* Background track - Full semi-circle */}
        <Path
          d={createArcPath(-90, 90)}
          stroke="#F5F5F5"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />

        {/* Red section (0-60 degrees - Left side - Too High/Low) */}
        <Path
          d={createArcPath(-90, -30)}
          stroke="#FF6B6B"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />

        {/* Yellow section (120-180 degrees - Right side - Average) */}
        <Path
          d={createArcPath(30, 90)}
          stroke="#FFD93D"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />

        {/* Green section (60-120 degrees - Middle - Good Price) */}
        <Path
          d={createArcPath(-30, 30)}
          stroke="#6BCF7F"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />

        {/* Needle */}
        <G transform={`rotate(${needleAngle} ${centerX} ${centerY})`}>
          <Path
            d={`M ${centerX - 1} ${centerY - 3} L ${centerX + needleLength - 8} ${centerY - 1} L ${centerX + needleLength - 8} ${centerY + 1} L ${centerX - 1} ${centerY + 3} Z`}
            fill="#2C3E50"
          />
          <Circle
            cx={centerX + needleLength - 12}
            cy={centerY}
            r="6"
            fill="#E74C3C"
          />
        </G>

        {/* Center hub */}
        <Circle
          cx={centerX}
          cy={centerY}
          r="12"
          fill="#2C3E50"
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill="#FFFFFF"
        />
      </Svg>

      {/* Status display */}
      <View style={[styles.statusContainer, { backgroundColor: bgColor }]}>
        <Text style={[styles.priceStatusText, { color: color }]}>{status}</Text>
        <Text style={styles.chanceText}>{chance}</Text>
      </View>

      {/* Gauge labels */}
      <View style={styles.gaugeLabels}>
        <Text style={[styles.labelText, { color: '#FF6B6B' }]}>Too High</Text>
        <Text style={[styles.labelText, { color: '#6BCF7F' }]}>Good Price</Text>
        <Text style={[styles.labelText, { color: '#FFD93D' }]}>Average</Text>
      </View>
    </View>
  );
};

export default function PriceSelectionScreen({ navigation, route }) {
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHint, setIsHint] = useState(false);
  const timeoutRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;


  // Get product data from previous screen
  const { productData } = route.params || {};

  // Extract fruit info
  const fruitCategory = (productData?.category || 'mango').toLowerCase();
  const fruitQuantity = productData?.quantity;
  const fruitPhoto = productData?.photos[0];
  const fruitName = productData?.fruitName || '';
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

  const handlePriceSelect = (price) => {
    setSelectedPrice(price);
    setCustomPrice(price.toString()); // Sync with custom input
    setShowCustomInput(false);
  };

  const handleCustomPrice = () => {
    setShowCustomInput(true);
    // Don't clear selectedPrice here to maintain sync
  };

  const handleCustomPriceChange = (value) => {
    setCustomPrice(value);
    if (value && !isNaN(parseFloat(value))) {
      setSelectedPrice(parseFloat(value));
    } else if (!value) {
      // If input is cleared, reset to zero
      setSelectedPrice();
      setCustomPrice();
    }
  };

  const handleContinue = () => {
    const finalPrice = selectedPrice;

    if (!finalPrice || finalPrice <= 0) {
      Alert.alert('कृपया मूल्य चुनें', 'Please select a price for your fruit.');
      return;
    }

    // Simple success message
    Alert.alert(
      '🎉 बधाई हो!',
      `आपका ${productData?.fruitName} ₹${finalPrice}/किग्रा पर लिस्ट हो गया है!`,
      [{ text: 'Great!', onPress: () => navigation.navigate('Home') }]
    );
  };

  // Simple loading screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <MaterialCommunityIcons name="leaf" size={56} color="#4CAF50" />
            <Text style={styles.loadingTitle}>बाज़ार की जानकारी ले रहे हैं...</Text>
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
              <Text style={styles.fruitLocation}>Pune, Maharashtra</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.fruitPrice}>₹{selectedPrice || smartPricing.recommended}/kg</Text>
            <Text style={styles.fruitTons}>{fruitQuantity}</Text>
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

          {/* Simple Help Text */}
          {isHint && <Text style={styles.helpText}>
            💡 सलाह: आज के बाज़ार भाव के अनुसार ₹{smartPricing.recommended} सबसे अच्छा है
          </Text>}
        </View>

        {/* Price Gauge Section - Direct part of screen */}
        <PriceGauge
          currentPrice={selectedPrice || smartPricing.recommended}
          minPrice={smartPricing.min}
          maxPrice={smartPricing.max}
          recommendedPrice={smartPricing.recommended}
        />

        {/* Market Info - Simple section without card */}
        <View style={styles.marketInfo}>
          <View style={styles.marketRow}>
            <Text style={styles.marketLabel}>Current mandi average</Text>
            <Text style={styles.marketValue}>₹{Math.round(smartPricing.recommended * 0.85)}</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>KrushiMandi suggested price range</Text>
            <Text style={styles.suggestionRange}>₹{smartPricing.min} - {smartPricing.max}</Text>
          </View>
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

  // Gauge Container
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'white',
    marginHorizontal: 4,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  // Price Display (at the top of gauge)
  priceDisplayTop: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPriceTextLarge: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2C3E50',
  },

  // SVG Gauge
  gaugeSvg: {
    marginBottom: 12,
  },

  // Status Container (below gauge)
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  priceStatusText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chanceText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Price Display (center of gauge) - keeping for backward compatibility
  priceDisplay: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
  },
  currentPriceText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },

  // Gauge Labels
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Market Info
  marketInfo: {
    backgroundColor: 'white',
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  marketLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  marketValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
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

  // Suggestion Row
  suggestionRow: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  suggestionLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  suggestionRange: {
    fontSize: 16,
    fontWeight: '700',
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

  // Custom Input
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  customButtonText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginLeft: 8,
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

  // Fruit Display Card - Now below price
  fruitCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  fruitIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fruitInfo: {
    flex: 1,
  },
  fruitName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  fruitQuantity: {
    fontSize: 14,
    color: '#666',
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
