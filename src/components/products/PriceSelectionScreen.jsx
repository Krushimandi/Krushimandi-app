import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Alert,
  ScrollView,
  TextInput,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

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
  
  // Calculate angle for current price (180 to 0 degrees - left to right)
  const priceRange = maxPrice - minPrice;
  const currentRange = currentPrice - minPrice;
  const priceRatio = Math.max(0, Math.min(1, currentRange / priceRange));
  
  // Map price ratio to angle (180° = left/start, 0° = right/end)
  const angle = 180 - (priceRatio * 180);
  
  // Get color and status based on price position
  const getPriceStatus = () => {
    if (priceRatio < 0.4) return { 
      color: '#FF6B6B', 
      status: 'Too Low', 
      chance: 'High chance to sell',
      bgColor: '#FFE5E5'
    };
    if (priceRatio < 0.8) return { 
      color: '#FFD93D', 
      status: 'Average', 
      chance: 'Good chance to sell',
      bgColor: '#FFF8E1'
    };
    return { 
      color: '#FF6B6B', 
      status: 'Too High', 
      chance: 'Very low chance to sell',
      bgColor: '#FFE5E5'
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
        
        {/* Yellow section (60-120 degrees - Middle - Average) */}
        <Path
          d={createArcPath(-30, 30)}
          stroke="#FFD93D"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Green section (120-180 degrees - Right side - Good Price) */}
        <Path
          d={createArcPath(30, 90)}
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
        <Text style={[styles.labelText, { color: '#FFD93D' }]}>Average</Text>
        <Text style={[styles.labelText, { color: '#6BCF7F' }]}>Good Price</Text>
      </View>
    </View>
  );
};

export default function PriceSelectionScreen({ navigation, route }) {
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get product data from previous screen
  const { productData } = route.params || {};
  
  // Extract fruit info
  const fruitCategory = (productData?.category || 'mango').toLowerCase();
  const fruitName = productData?.fruitName || '';
  const fruitVariety = fruitName.toLowerCase().includes('alphonso') ? 'alphonso' : 
                      fruitName.toLowerCase().includes('kesar') ? 'kesar' : 'totapuri';
  
  const smartPricing = getSmartPrice(fruitCategory, fruitVariety);
  
  useEffect(() => {
    // Simple loading simulation
    console.log('PriceSelection: Loading started');
    setTimeout(() => {
      console.log('PriceSelection: Loading completed, showing content');
      setIsLoading(false);
      setSelectedPrice(smartPricing.recommended); // Auto-select recommended price
    }, 800); // Reduced loading time
  }, [smartPricing.recommended]);

  const handlePriceSelect = (price) => {
    setSelectedPrice(price);
    setShowCustomInput(false);
    setCustomPrice('');
  };

  const handleCustomPrice = () => {
    setShowCustomInput(true);
    setSelectedPrice(null);
  };

  const handleCustomPriceChange = (value) => {
    setCustomPrice(value);
    if (value) {
      setSelectedPrice(parseFloat(value));
    }
  };

  const handleContinue = () => {
    const finalPrice = selectedPrice || parseFloat(customPrice);
    
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
        <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
        
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
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>अपना भाव तय करें</Text>
          <Text style={styles.headerSubtitle}>Set Your Price</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Price Gauge Section */}
        <View style={styles.gaugeCard}>
          <PriceGauge 
            currentPrice={selectedPrice || smartPricing.recommended}
            minPrice={smartPricing.min}
            maxPrice={smartPricing.max}
            recommendedPrice={smartPricing.recommended}
          />
          
          {/* Market Info */}
          <View style={styles.marketInfo}>
            <View style={styles.marketRow}>
              <Text style={styles.marketLabel}>Current mandi average</Text>
              <Text style={styles.marketValue}>₹{Math.round(smartPricing.recommended * 0.85)}</Text>
            </View>
            
            <View style={styles.priceOptionsRow}>
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
            
            <View style={styles.suggestionRow}>
              <Text style={styles.suggestionLabel}>KrushiMandi suggested price range</Text>
              <Text style={styles.suggestionRange}>₹{smartPricing.min} - {smartPricing.max}</Text>
            </View>
          </View>
        </View>

        {/* Custom Price Input */}
        <View style={styles.customInputCard}>
          <Text style={styles.customInputTitle}>या अपना भाव डालें</Text>
          <Text style={styles.customInputSubtitle}>Enter custom price</Text>
          
          <TouchableOpacity 
            style={styles.customButton}
            onPress={handleCustomPrice}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#666" />
            <Text style={styles.customButtonText}>अपना भाव लिखें</Text>
          </TouchableOpacity>

          {showCustomInput && (
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
              <Text style={styles.unitLabel}>प्रति किग्रा</Text>
            </View>
          )}
        </View>

        {/* Fruit Display - Now Below Price */}
        <View style={styles.fruitCard}>
          <View style={styles.fruitIcon}>
            <MaterialCommunityIcons 
              name={fruitCategory === 'mango' ? 'fruit-grapes' : 'apple'} 
              size={48} 
              color="#4CAF50" 
            />
          </View>
          <View style={styles.fruitInfo}>
            <Text style={styles.fruitName}>{productData?.fruitName || 'Fresh Fruit'}</Text>
            <Text style={styles.fruitQuantity}>{productData?.quantity} available</Text>
          </View>
        </View>

        {/* Simple Continue Button */}
        <TouchableOpacity 
          style={[styles.continueButton, { opacity: selectedPrice ? 1 : 0.5 }]}
          onPress={handleContinue}
          disabled={!selectedPrice}
        >
          <MaterialCommunityIcons name="check-circle" size={24} color="white" />
          <Text style={styles.continueText}>फल को बाज़ार में डालें</Text>
        </TouchableOpacity>

        {/* Simple Help Text */}
        <Text style={styles.helpText}>
          💡 सलाह: आज के बाज़ार भाव के अनुसार ₹{smartPricing.recommended} सबसे अच्छा है
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Simple Header
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight + 12,
    paddingBottom: 16,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Debug: ensure background is visible
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    minHeight: 600,
  },

  // Gauge Card
  gaugeCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  // Gauge Container
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  // Price Display (at the top of gauge)
  priceDisplayTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentPriceTextLarge: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2C3E50',
  },
  
  // SVG Gauge
  gaugeSvg: {
    marginBottom: 20,
  },
  
  // Status Container (below gauge)
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
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
    marginTop: 20,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  priceOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  priceChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    paddingTop: 16,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  customInputTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  customInputSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 16,
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
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 8,
  },
  customTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
  },

  // Fruit Display Card - Now below price
  fruitCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
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
    paddingHorizontal: 16,
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
