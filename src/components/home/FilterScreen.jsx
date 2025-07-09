import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SUPPORTED_FRUIT_TYPES } from '../../constants/Fruits';

const fruitTypes = [
  { name: 'Apple', image: require('../../assets/fruits/Apple.png') },
  { name: 'Banana', image: require('../../assets/fruits/banana.png') },
  { name: 'Grape', image: require('../../assets/fruits/grapes.png') },
  { name: 'Orange', image: require('../../assets/fruits/orange.png') },
  { name: 'Mango', image: require('../../assets/fruits/mango.png') },
  { name: 'Pomegranate', image: require('../../assets/fruits/pomegranate.png') },
  { name: 'Sweet Lemon', image: require('../../assets/fruits/sweetlemon.png') },
];

const additionalFeatures = [
  'Organic',
  'Top Rated',
  'Fresh Stock',
  'On Discount',
  'In season',
  'Off season',
  'In Stock',
  'Out of Stock',
];

const FilterScreen = ({ onApplyFilters, onClose, isModal = false }) => {
  const navigation = useNavigation();
  const [selectedFruit, setSelectedFruit] = useState('Apple');
  const [selectedFeatures, setSelectedFeatures] = useState(['Top Rated']);
  const [minPrice, setMinPrice] = useState(30);
  const [maxPrice, setMaxPrice] = useState(250);
  const [minRating, setMinRating] = useState(4);

  const toggleFeature = (feature) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleApplyFilters = () => {
    // Apply filters logic here
    const filters = {
      selectedFruit,
      selectedFeatures,
      minPrice,
      maxPrice,
      minRating
    };
    console.log('Applying filters:', filters);
    
    if (isModal && onApplyFilters) {
      onApplyFilters(filters);
    } else {
      navigation.goBack();
    }
  };

  const handleClearFilters = () => {
    setSelectedFruit('Apple');
    setSelectedFeatures([]);
    setMinPrice(0);
    setMaxPrice(250);
    setMinRating(1);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isModal && styles.modalSafeArea]}>
      {!isModal && (
        <>
          <StatusBar
            backgroundColor="transparent"
            translucent={true}
            barStyle="dark-content"
          />
          
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#007E2F" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Filters</Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearFilters}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView style={styles.scrollContent}>

      {/* Selected Tags */}
      <View style={styles.selectedTags}>
        {[`₹${minPrice} - ₹${maxPrice}`, selectedFruit, ...selectedFeatures].map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity onPress={() => {
              // Handle tag removal
              if (selectedFeatures.includes(tag)) {
                toggleFeature(tag);
              }
            }}>
              <Icon name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Fruit Type Section */}
      <Text style={styles.sectionTitle}>Fruit type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <View style={styles.fruitOptionsRow}>
          {fruitTypes.map((fruit) => (
            <TouchableOpacity
              key={fruit.name}
              style={[
                styles.fruitOption,
                selectedFruit === fruit.name && styles.fruitOptionSelected,
              ]}
              onPress={() => setSelectedFruit(fruit.name)}
            >
              <View style={[
                styles.fruitIconContainer,
                selectedFruit === fruit.name && styles.fruitIconContainerSelected
              ]}>
                <Image source={fruit.image} style={styles.fruitIcon} />
              </View>
              <Text style={[
                styles.fruitText,
                selectedFruit === fruit.name && styles.fruitTextSelected
              ]}>{fruit.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Price Range */}
      <Text style={styles.sectionTitle}>Price per kg</Text>
      <View style={styles.priceRangeContainer}>
        <View style={styles.priceSliderContainer}>
          <View style={styles.priceSlider}>
            <View style={styles.priceTrack} />
            <View style={styles.priceRange} />
            <View style={[styles.priceThumb, styles.priceThumbLeft]} />
            <View style={[styles.priceThumb, styles.priceThumbRight]} />
          </View>
        </View>
        <View style={styles.priceLabelsContainer}>
          <View style={styles.priceLabel}>
            <Text style={styles.priceLabelText}>₹{minPrice}</Text>
          </View>
          <View style={styles.priceLabel}>
            <Text style={styles.priceLabelText}>₹{maxPrice}</Text>
          </View>
        </View>
      </View>

      {/* Additional Features */}
      <Text style={styles.sectionTitle}>Additional features</Text>
      <View style={styles.featuresContainer}>
        {additionalFeatures.map((feature) => (
          <TouchableOpacity
            key={feature}
            style={[
              styles.featureTag,
              selectedFeatures.includes(feature) && styles.featureTagSelected,
            ]}
            onPress={() => toggleFeature(feature)}
          >
            <Text
              style={[
                styles.featureText,
                selectedFeatures.includes(feature) && styles.featureTextSelected,
              ]}
            >
              {feature}
            </Text>
          </TouchableOpacity>
        ))}
      </View>



            {/* Customer Rating Filter */}
      <Text style={styles.sectionTitle}>Customer rating</Text>
      <View style={styles.ratingContainer}>
        {[4, 3, 0].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingOption,
              minRating === rating && styles.ratingOptionSelected,
            ]}
            onPress={() => setMinRating(rating)}
          >
            <Text
              style={[
                styles.ratingText,
                minRating === rating && styles.ratingTextSelected,
              ]}
            >
              {rating === 0 ? 'All Ratings' : `⭐ ${rating} & above`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomActions, isModal && styles.modalBottomActions]}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  close: {
    fontSize: 20,
    color: '#555',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tagText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tagClose: {
    color: '#6B7280',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  horizontalScroll: {
    marginBottom: 32,
  },
  fruitOptionsRow: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  fruitOption: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
  },
  fruitOptionSelected: {
    // Selected state handled by individual elements
  },
  fruitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fruitIconContainerSelected: {
    backgroundColor: '#E0F7FA',
    borderColor: '#007E2F',
    borderWidth: 2,
  },
  fruitIcon: {
    width: 36,
    height: 36,
  },
  fruitText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fruitTextSelected: {
    color: '#007E2F',
    fontWeight: '600',
  },
  priceRangeContainer: {
    marginBottom: 32,
  },
  priceSliderContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  priceSlider: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  priceTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  priceRange: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    left: '20%',
    right: '30%',
  },
  priceThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceThumbLeft: {
    left: '18%',
  },
  priceThumbRight: {
    right: '28%',
  },
  priceLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  priceLabel: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  featureTag: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  featureTagSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
  },
  featureText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  featureTextSelected: {
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  ratingOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  ratingOptionSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
  },
  ratingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  ratingTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
    safeArea: {
      flex: 1,
      backgroundColor: '#ffffff',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    modalSafeArea: {
      paddingTop: 0,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#EF4444',
    },
    clearButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    bottomActions: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    modalBottomActions: {
      position: 'relative',
      bottom: 'auto',
      shadowOpacity: 0,
      elevation: 0,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    applyButton: {
      backgroundColor: '#007E2F',
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    applyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    });

export default FilterScreen;

