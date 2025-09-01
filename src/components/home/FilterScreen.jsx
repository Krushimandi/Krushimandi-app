import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Feature list: seasonal and rating-based options are disabled for now (kept as comments for later)
const additionalFeatures = [
  // { name: 'Top Rated', icon: 'star', color: '#F39C12' }, // disabled for now
  { name: 'Fresh Stock', icon: 'time-outline', color: '#3498DB' },
  // { name: 'In Season', icon: 'sunny-outline', color: '#F39C12' }, // disabled for now
  // { name: 'Off Season', icon: 'snow-outline', color: '#95A5A6' }, // disabled for now
  { name: 'With Images', icon: 'images-outline', color: '#8B5CF6' },
  { name: 'Available Now', icon: 'checkmark-circle-outline', color: '#10B981' },
];

const priceRanges = [
  { label: '₹0 - ₹20', min: 0, max: 20 },
  { label: '₹20 - ₹40', min: 20, max: 40 },
  { label: '₹40 - ₹60', min: 40, max: 60 },
  { label: '₹60+', min: 60, max: 500 },
];

const FilterScreen = ({ onApplyFilters, onClose, isModal = false, currentFilters = {}, onClearFilters }) => {
  const navigation = useNavigation();

  // Debug props on component mount
  console.log('🎯 FilterScreen mounted with props:', {
    onApplyFilters: typeof onApplyFilters,
    onClose: typeof onClose,
    onClearFilters: typeof onClearFilters,
    isModal,
    currentFilters
  });

  // Initialize state with current filters or defaults
  const [selectedFeatures, setSelectedFeatures] = useState(currentFilters.selectedFeatures || []);
  const [selectedPriceRange, setSelectedPriceRange] = useState(currentFilters.priceRange || null);
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice || 0);
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice || 500);
  const [minRating, setMinRating] = useState(currentFilters.minRating || 0);

  // Update state when currentFilters prop changes
  useEffect(() => {
    console.log('📥 FilterScreen received currentFilters:', currentFilters);
    setSelectedFeatures(currentFilters.selectedFeatures || []);
    setSelectedPriceRange(currentFilters.priceRange || null);
    setMinPrice(currentFilters.minPrice || 0);
    setMaxPrice(currentFilters.maxPrice || 500);
    setMinRating(currentFilters.minRating || 0);
  }, [currentFilters]);

  const toggleFeature = useCallback((featureName) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureName)
        ? prev.filter((f) => f !== featureName)
        : [...prev, featureName]
    );
  }, []);

  const handlePriceRangeSelect = useCallback((range) => {
    console.log('💰 Price range selected:', range);
    setSelectedPriceRange(range.label);
    setMinPrice(range.min);
    setMaxPrice(range.max);
  }, []);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedFeatures.length > 0) count += selectedFeatures.length;
    if (selectedPriceRange) count++;
    // Rating disabled for now; to re-enable, include minRating > 0
    // if (minRating > 0) count++;
    return count;
  };

  const handleApplyFilters = () => {
    const filters = {
      selectedFeatures,
      priceRange: selectedPriceRange,
      minPrice,
      maxPrice,
      minRating
    };

    console.log('🎯 FilterScreen applying filters:', filters);
    console.log('🔍 onApplyFilters prop exists:', typeof onApplyFilters);
    console.log('🔍 onClose prop exists:', typeof onClose);

    if (onApplyFilters && typeof onApplyFilters === 'function') {
      onApplyFilters(filters);
    } else {
      console.error('❌ onApplyFilters prop is not a function or is missing');
      console.error('❌ Available props:', { onApplyFilters, onClose, isModal, currentFilters, onClearFilters });
    }

    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('⚠️ onClose prop is not a function or is missing');
    }
  };

  const handleClearFilters = () => {
    console.log('🧹 FilterScreen clearing filters');

    // Clear all filter states
    setSelectedFeatures([]);
    setSelectedPriceRange(null);
    setMinPrice(0);
    setMaxPrice(500);
    setMinRating(0);

    // Call parent clear function if provided
    if (onClearFilters) {
      onClearFilters();
    }

    console.log('✅ FilterScreen filters cleared');
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

          {/* Enhanced Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#007E2F" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerText}>Filters 00</Text>
              {getActiveFiltersCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.clearButton,
                getActiveFiltersCount() === 0 && styles.clearButtonDisabled
              ]}
              onPress={handleClearFilters}
              disabled={getActiveFiltersCount() === 0}
              activeOpacity={0.8}
            >
              <Icon
                name="refresh"
                size={16}
                color={getActiveFiltersCount() === 0 ? '#9CA3AF' : '#FFFFFF'}
                style={styles.clearButtonIcon}
              />
              <Text style={[
                styles.clearButtonText,
                getActiveFiltersCount() === 0 && styles.clearButtonTextDisabled
              ]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Quick Filter Tags */}
        {(selectedFeatures.length > 0 || selectedPriceRange /* || minRating > 0 */) && (
          <View style={styles.selectedTags}>
            {selectedPriceRange && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{selectedPriceRange}</Text>
                <TouchableOpacity onPress={() => setSelectedPriceRange(null)}>
                  <Icon name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedFeatures.map((feature) => (
              <View key={feature} style={styles.tag}>
                <Text style={styles.tagText}>{feature}</Text>
                <TouchableOpacity onPress={() => toggleFeature(feature)}>
                  <Icon name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
            {/* Rating tag disabled for now; keep for future */}
            {/* {minRating > 0 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>⭐ {minRating}+ Stars</Text>
                <TouchableOpacity onPress={() => setMinRating(0)}>
                  <Icon name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )} */}
          </View>
        )}

        {/* Price Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.priceGrid}>
            {priceRanges.map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[
                  styles.priceRangeCard,
                  selectedPriceRange === range.label && styles.priceRangeCardSelected,
                ]}
                onPress={() => handlePriceRangeSelect(range)}
                activeOpacity={0.7}
              >
                <Icon
                  name="pricetag"
                  size={20}
                  color={selectedPriceRange === range.label ? '#FFFFFF' : '#007E2F'}
                />
                <Text style={[
                  styles.priceRangeText,
                  selectedPriceRange === range.label && styles.priceRangeTextSelected,
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {additionalFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.name}
                style={[
                  styles.featureCard,
                  selectedFeatures.includes(feature.name) && styles.featureCardSelected,
                ]}
                onPress={() => toggleFeature(feature.name)}
                activeOpacity={0.7}
              >
                <Icon
                  name={feature.icon}
                  size={18}
                  color={selectedFeatures.includes(feature.name) ? '#FFFFFF' : feature.color}
                />
                <Text style={[
                  styles.featureCardText,
                  selectedFeatures.includes(feature.name) && styles.featureCardTextSelected,
                ]}>
                  {feature.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Customer Rating Section - disabled for now; keep markup for future re-enable */}
        {false && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Rating</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <View style={styles.ratingHorizontalGrid}>
                {[4, 3, 2, 1, 0].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingHorizontalCard,
                      minRating === rating && styles.ratingHorizontalCardSelected,
                    ]}
                    onPress={() => setMinRating(rating)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.ratingHorizontalCardText,
                      minRating === rating && styles.ratingHorizontalCardTextSelected,
                    ]}>
                      {rating === 0 ? '🌟 All' : `⭐ ${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Enhanced Bottom Actions */}
      <View style={[styles.bottomActions, isModal && styles.modalBottomActions]}>
        <View style={styles.filtersInfo}>
          <Text style={styles.filtersInfoText}>
            {getActiveFiltersCount() > 0
              ? `${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} applied`
              : 'No filters applied'
            }
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.applyButton, getActiveFiltersCount() === 0 && styles.applyButtonDisabled]}
          onPress={handleApplyFilters}
          activeOpacity={0.8}
        >
          <Icon name="checkmark-circle" size={20} color="#FFFFFF" style={styles.applyButtonIcon} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterBadge: {
    backgroundColor: '#007E2F',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 28,
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
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    color: '#00695C',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Horizontal Scroll
  horizontalScroll: {
    marginBottom: 8,
    paddingVertical: 10,
  },

  // Price Range Styles
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceRangeCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  priceRangeCardSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
    transform: [{ scale: 1.02 }],
  },
  priceRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  priceRangeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Features Styles
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: (width - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureCardSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
    transform: [{ scale: 1.02 }],
  },
  featureCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  featureCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Rating Styles - Horizontal
  ratingHorizontalGrid: {
    flexDirection: 'row',
    paddingRight: 20,
    gap: 12,
  },
  ratingHorizontalCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingHorizontalCardSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
    transform: [{ scale: 1.05 }],
  },
  ratingHorizontalCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ratingHorizontalCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Legacy Rating Styles (kept for backwards compatibility)
  ratingGrid: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingCardSelected: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
    transform: [{ scale: 1.02 }],
  },
  ratingCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ratingCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  bottomSpacing: {
    height: 20,
  },

  // Bottom Actions
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalSafeArea: {
    paddingTop: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
    justifyContent: 'center',
  },
  clearButtonDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  clearButtonIcon: {
    marginRight: 4,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clearButtonTextDisabled: {
    color: '#9CA3AF',
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
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBottomActions: {
    position: 'relative',
    bottom: 'auto',
    shadowOpacity: 0,
    elevation: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  filtersInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersInfoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#007E2F',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  applyButtonIcon: {
    marginRight: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Legacy styles for backwards compatibility
  close: {
    fontSize: 20,
    color: '#555',
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
});

export default FilterScreen;

