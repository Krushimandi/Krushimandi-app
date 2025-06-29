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

const fruitTypes = [
  { name: 'Apple', icon: 'https://img.icons8.com/color/48/apple.png' },
  { name: 'Banana', icon: 'https://img.icons8.com/color/48/banana.png' },
  { name: 'Grapes', icon: 'https://img.icons8.com/color/48/grapes.png' },
  { name: 'Watermelon', icon: 'https://img.icons8.com/color/48/watermelon.png' },
  { name: 'Orange', icon: 'https://img.icons8.com/color/48/orange.png' },
  { name: 'Pineapple', icon: 'https://img.icons8.com/color/48/pineapple.png' },
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

const FilterScreen = () => {
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
    console.log('Applying filters:', {
      selectedFruit,
      selectedFeatures,
      minPrice,
      maxPrice,
      minRating
    });
    navigation.goBack();
  };

  const handleClearFilters = () => {
    setSelectedFruit('Apple');
    setSelectedFeatures([]);
    setMinPrice(0);
    setMaxPrice(250);
    setMinRating(1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

      <ScrollView style={styles.scrollContent}>

      {/* Selected Tags */}
      <View style={styles.selectedTags}>
        {[`₹${minPrice} - ₹${maxPrice}`, selectedFruit, ...selectedFeatures].map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <Text style={styles.tagClose}>×</Text>
          </View>
        ))}
      </View>

      {/* Fruit Type Section */}
      <Text style={styles.sectionTitle}>Fruit type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {fruitTypes.map((fruit) => (
          <TouchableOpacity
            key={fruit.name}
            style={[
              styles.fruitOption,
              selectedFruit === fruit.name && styles.fruitOptionSelected,
            ]}
            onPress={() => setSelectedFruit(fruit.name)}
          >
            <Image source={{ uri: fruit.icon }} style={styles.fruitIcon} />
            <Text style={styles.fruitText}>{fruit.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Price Range */}
      <Text style={styles.sectionTitle}>Price per kg</Text>
      <View style={styles.priceRangeContainer}>
        <Text style={styles.priceLabel}>Select price range:</Text>
        <View style={styles.priceOptionsContainer}>
          <TouchableOpacity 
            style={[styles.priceOption, minPrice === 0 && styles.priceOptionSelected]}
            onPress={() => setMinPrice(0)}
          >
            <Text style={[styles.priceOptionText, minPrice === 0 && styles.priceOptionTextSelected]}>₹0-50</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.priceOption, minPrice === 50 && styles.priceOptionSelected]}
            onPress={() => setMinPrice(50)}
          >
            <Text style={[styles.priceOptionText, minPrice === 50 && styles.priceOptionTextSelected]}>₹50-100</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.priceOption, minPrice === 100 && styles.priceOptionSelected]}
            onPress={() => setMinPrice(100)}
          >
            <Text style={[styles.priceOptionText, minPrice === 100 && styles.priceOptionTextSelected]}>₹100-200</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.priceOption, minPrice === 200 && styles.priceOptionSelected]}
            onPress={() => setMinPrice(200)}
          >
            <Text style={[styles.priceOptionText, minPrice === 200 && styles.priceOptionTextSelected]}>₹200+</Text>
          </TouchableOpacity>
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
      <View style={styles.bottomActions}>
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
    padding: 16,
    paddingBottom: 100, // Space for bottom action button
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  close: {
    fontSize: 20,
    color: '#555',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 4,
  },
  tagText: {
    color: 'black',
    marginRight: 4,
  },
  tagClose: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    color: 'black',
  },
  fruitOption: {
    alignItems: 'center',
    padding: 10,
    margin: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
  },
  fruitOptionSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  fruitText: {
    marginTop: 4,
    color: '#2E7D32',
    fontSize: 12,
  },
  fruitIcon: {
    width: 40,
    height: 40,
  },
  priceRangeContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  priceOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceOption: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  priceOptionSelected: {
    backgroundColor: '#2E7D32',
  },
  priceOptionText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  priceOptionTextSelected: {
    color: '#FFFFFF',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    borderWidth: 1,
    borderColor: 'green',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 4,
  },
  featureTagSelected: {
    backgroundColor: '#2E7D32',
  },
  featureText: {
    color: 'black',
  },
  featureTextSelected: {
    color: '#fff',
  },






      ratingContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginVertical: 8,
    },
    ratingOption: {
      borderWidth: 1,
      borderColor: 'green',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      margin: 4,
      backgroundColor: '#fff',
    },
    ratingOptionSelected: {
      backgroundColor: '#4CAF50',
    },
    ratingText: {
      color: '#4CAF50',
      fontSize: 14,
    },
    ratingTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    safeArea: {
      flex: 1,
      backgroundColor: '#ffffff',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F6F6F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#FF6B6B',
    },
    clearButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    bottomActions: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: '#EFEFEF',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    applyButton: {
      backgroundColor: '#007E2F',
      borderRadius: 26,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    applyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    });

export default FilterScreen;

