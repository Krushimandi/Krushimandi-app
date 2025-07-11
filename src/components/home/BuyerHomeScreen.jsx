// HomeScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Platform,
  SafeAreaView,
  Modal,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser } from '../../services/firebaseService';
import { getMarketplaceFruits } from '../../services/fruitService';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../constants';
import FilterScreen from './FilterScreen';
import Toast from 'react-native-toast-message';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation,
  getRelativeTime,
  getDaysSince
} from '../../utils/formatters';
const categories = [
  { name: 'All', type: 'all', icon: null },
  { name: 'Banana', type: 'banana', icon: require('../../assets/fruits/banana.png') },
  { name: 'Orange', type: 'orange', icon: require('../../assets/fruits/orange.png') },
  { name: 'Grape', type: 'grape', icon: require('../../assets/fruits/grapes.png') },
  { name: 'Pomegranate', type: 'pomegranate', icon: require('../../assets/fruits/pomegranate.png') },
  { name: 'Sweet Lemon', type: 'sweet lemon', icon: require('../../assets/fruits/sweetlemon.png') },
  { name: 'Apple', type: 'apple', icon: require('../../assets/fruits/Apple.png') },
  { name: 'Mango', type: 'mango', icon: require('../../assets/fruits/mango.png') },
];

const HEADER_MAX_HEIGHT = 158; // Maximum header height
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 95 : 75; // Minimum header height after scroll
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const BuyerHomeScreen = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [allFruits, setAllFruits] = useState([]); // Store all fruits for filtering
  const [loadingFruits, setLoadingFruits] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Calculate header height and opacity based on scroll
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const titleIndex = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 50, 100],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Filter modal functions
  const openFilterModal = () => {
    setIsFilterModalVisible(true);
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsFilterModalVisible(false);
    });
  };

  const handleApplyFilters = (filters) => {
    let filtered = [...allFruits];

    // Apply price range filter
    if (filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max < 1000)) {
      filtered = filtered.filter(fruit => {
        const price = parseFloat(fruit.price_per_kg);
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }

    // Apply grade filter
    if (filters.grade && filters.grade.length > 0) {
      filtered = filtered.filter(fruit =>
        filters.grade.includes(fruit.grade)
      );
    }

    // Apply location filter
    if (filters.location && filters.location.trim()) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter(fruit =>
        fruit.location?.village?.toLowerCase().includes(locationLower) ||
        fruit.location?.district?.toLowerCase().includes(locationLower) ||
        fruit.location?.state?.toLowerCase().includes(locationLower)
      );
    }

    // Apply quantity filter
    if (filters.minQuantity && filters.minQuantity > 0) {
      filtered = filtered.filter(fruit => {
        const minQty = fruit.quantity?.[0] || 0;
        return minQty >= filters.minQuantity;
      });
    }

    // Apply category filter if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(fruit =>
        fruit.type?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(fruit =>
        fruit.name?.toLowerCase().includes(searchLower) ||
        fruit.type?.toLowerCase().includes(searchLower) ||
        fruit.description?.toLowerCase().includes(searchLower)
      );
    }

    setFruits(filtered);
    closeFilterModal();
  };
  // Safe navigation function to prevent "route not defined" errors
  const safeNavigate = (routeName, params = {}) => {
    try {
      navigation.navigate(routeName, params);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', `Cannot navigate to ${routeName}. This screen may not be available.`);
    }
  };

  const loadUserProfile = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        handleUserValidationFailure();
        return;
      }

      // First validate if the user still exists on Firebase server
      const isValidUser = await validateCurrentUser();
      if (!isValidUser) {
        handleUserValidationFailure();
        return;
      }

      // Get complete user profile from Firestore/AsyncStorage
      const profile = await getCompleteUserProfile();

      if (profile) {
        setUserProfile(profile);

        // Update last login in background
        if (profile.uid && profile.userRole) {
          updateLastLogin(profile.uid, profile.userRole).catch(console.error);
        }
      } else {
        handleUserValidationFailure();
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      handleUserValidationFailure();
    }
  };

  const handleUserValidationFailure = () => {
    Toast.show({
      type: 'error',
      text1: 'Authentication Error',
      text2: 'Your session has expired or your account is no longer valid. Please sign in again.',
      position: 'bottom',
    });

    // Navigate back to auth flow using our utility function
    import('../../utils/navigationUtils').then(
      ({ navigateToAuth }) => navigateToAuth()
    );
  };

  // Get display name for greeting
  const getDisplayName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (userProfile?.displayName) {
      return userProfile.displayName.split(' ')[0];
    }
    return 'bhau';
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={12} color="#FFB800" style={{ marginRight: 1 }} />);
      } else if (i === fullStars && halfStar) {
        stars.push(<Icon key={i} name="star-half" size={12} color="#FFB800" style={{ marginRight: 1 }} />);
      } else {
        stars.push(<Icon key={i} name="star-outline" size={12} color="#FFB800" style={{ marginRight: 1 }} />);
      }
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
        {stars}
        <Text style={{ color: '#505050', fontSize: 10, marginLeft: 3 }}>{rating}</Text>
      </View>
    );
  };

  // Load marketplace fruits from Firebase
  const loadMarketplaceFruits = async () => {
    try {
      setLoadingFruits(true);

      const marketplaceFruits = await getMarketplaceFruits(100);

      if (marketplaceFruits && Array.isArray(marketplaceFruits) && marketplaceFruits.length > 0) {
        setAllFruits(marketplaceFruits);
        setFruits(marketplaceFruits);
      } else {
        setAllFruits([]);
        setFruits([]);

        Toast.show({
          type: 'info',
          text1: '📋 No Data',
          text2: 'No fruits found in database',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Error loading marketplace fruits:', error);

      setAllFruits([]);
      setFruits([]);

      Toast.show({
        type: 'error',
        text1: '❌ Data Load Failed',
        text2: 'Unable to load fruits. Check connection.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setLoadingFruits(false);
    }
  };

  // Filter fruits based on category and search query
  const filterFruits = (category, search) => {
    let filtered = [...allFruits];

    // Filter by category
    if (category !== 'all' && category !== 'All') {
      filtered = filtered.filter(fruit => {
        const fruitType = fruit.type?.toLowerCase();
        const filterCategory = category.toLowerCase();
        return fruitType === filterCategory;
      });
    }

    // Filter by search query
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(fruit => {
        const matchName = fruit.name?.toLowerCase().includes(searchLower);
        const matchType = fruit.type?.toLowerCase().includes(searchLower);
        const matchDescription = fruit.description?.toLowerCase().includes(searchLower);
        const matchVillage = fruit.location?.village?.toLowerCase().includes(searchLower);
        const matchDistrict = fruit.location?.district?.toLowerCase().includes(searchLower);
        const matchState = fruit.location?.state?.toLowerCase().includes(searchLower);

        return matchName || matchType || matchDescription || matchVillage || matchDistrict || matchState;
      });
    }

    setFruits(filtered);
  };

  // Handle category change
  const handleCategoryChange = (categoryType) => {
    setSelectedCategory(categoryType);
    filterFruits(categoryType, searchQuery);
  };

  // Handle search query change
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    filterFruits(selectedCategory, query);
  };

  // Handle refresh
  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    loadMarketplaceFruits();
  };

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketplaceFruits();
    setRefreshing(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFruits([...allFruits]);
  };

  // Load fruits when component mounts
  useEffect(() => {
    loadMarketplaceFruits();
  }, []);

  // Reload fruits when screen comes into focus (to show newly added fruits)
  useFocusEffect(
    React.useCallback(() => {
      loadMarketplaceFruits();
    }, [])
  );

  // Filter fruits whenever search or category changes
  useEffect(() => {
    if (allFruits.length > 0) {
      filterFruits(selectedCategory, searchQuery);
    }
  }, [selectedCategory, searchQuery, allFruits]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="transparent"
        translucent={true}
        barStyle="dark-content"
      />

      {/* Fixed Header Title - Shows on scroll */}
      <Animated.View
        style={[
          styles.fixedHeaderTitle,
          {
            opacity: titleOpacity,
            zIndex: titleIndex,
          }
        ]}>
        <Image source={require('../../assets/icon.png')} style={styles.fixedHeaderImage} />        <TouchableOpacity
          style={styles.notificationIconButton}
          onPress={() => {
            navigation.navigate('Notification');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
            title="Loading fresh fruits..."
            titleColor={Colors.light.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Collapsible Header */}
        <Animated.View style={[
          styles.header,
          {
            height: headerHeight,
            opacity: headerOpacity
          }
        ]}>
          <View style={styles.headerRow}>
            <View style={styles.profileContainer}>
              {userProfile?.profileImage ? (
                <TouchableOpacity onPress={() => {
                  safeNavigate('ProfileScreen');
                }}
                  style={styles.profileImageButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.profileImage}>
                    <Image
                      source={{ uri: userProfile.profileImage }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profilePlaceholderButton} onPress={() => {
                    safeNavigate('ProfileScreen');
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.profilePlaceholder}>
                    <Octicons
                      name="person"
                      size={24}
                      color="#000"
                    />
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.userInfo}
                onPress={() => {
                  safeNavigate('ProfileScreen');
                }}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 10 }}
              >
                <Text style={styles.welcome}>
                  Namaste {getDisplayName()}!
                </Text>
                <View style={styles.locationContainer}>
                  <Text style={styles.location}>
                    Paithan, Chhatrapati Sambhajinagar
                  </Text>
                  <Icon name="chevron-down" size={12} color="#505050" />
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                safeNavigate('Notification');
              }}
              style={styles.notificationIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="notifications-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Icon name="search" size={20} color="#939393" style={{ marginLeft: 12 }} />
              <TextInput
                placeholder="Search fruits, vegetables..."
                placeholderTextColor="#939393"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleSearchChange('')}
                  style={{ paddingRight: 12 }}
                >
                  <Icon name="close-circle" size={20} color="#939393" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Model */}
            <TouchableOpacity style={styles.filterBtn} onPress={() => {
              openFilterModal();
            }}>
              <Icon name="options-outline" size={20} color={Colors.light.primaryDark} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryCard,
                  selectedCategory === item.type && styles.selectedCategoryCard
                ]}
                onPress={() => handleCategoryChange(item.type)}
              >
                {item.name === 'All' ? (
                  <Icon name="apps-outline" size={22} color={"#505050"} style={[styles.categoryIcon, {
                    marginHorizontal: 6,
                  }]} />
                ) : (
                  <Image source={item.icon} style={styles.categoryImage} />
                )}
                <Text style={[
                  styles.categoryText, {
                    marginHorizontal: item.name === 'All' ? 4 : 0
                  },
                  selectedCategory === item.type && styles.selectedCategoryText
                ]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Available Fruits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Fruits</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fruitsContainer}>
            {loadingFruits ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIcon}>
                  <Icon name="refresh-outline" size={48} color="#CCCCCC" />
                </View>
                <Text style={styles.emptyStateTitle}>Loading Fruits...</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Please wait while we fetch fresh fruits from farmers
                </Text>
              </View>
            ) : fruits.length > 0 ? (
              fruits.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.fruitCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Navigate to the ProductDetail screen with complete fruit data
                    console.log('🔍 Navigating to ProductDetail with fruit data:', {
                      id: item.id,
                      name: item.name,
                      imageCount: item.image_urls?.length || 0,
                      images: item.image_urls,
                      allFields: Object.keys(item),
                      hasId: !!item.id,
                      productObjectId: item.id // This should be included in the product object
                    });

                    safeNavigate('ProductDetail', {
                      product: {
                        // Core fruit properties from fruit.ts schema
                        id: item.id, // IMPORTANT: Include id in the product object
                        name: item.name,
                        type: item.type,
                        grade: item.grade,
                        description: item.description,
                        quantity: item.quantity,
                        price_per_kg: item.price_per_kg,
                        availability_date: item.availability_date,
                        image_urls: item.image_urls || [],
                        location: item.location,
                        farmer_id: item.farmer_id,
                        status: item.status || 'active',
                        views: item.views || 0,
                        likes: item.likes || 0,
                        created_at: item.created_at,
                        updated_at: item.updated_at || item.created_at,

                        // Additional display properties for compatibility
                        rating: 4.8, // Default rating for now
                        reviewCount: Math.floor((item.likes || 0) * 2),
                        freshness: 'Fresh',
                        details: `${item.name} from ${formatLocation(item.location)}. Available quantity: ${formatFruitQuantity(item.quantity)}`,
                        image: { uri: item.image_urls?.[0] || 'https://via.placeholder.com/150' }, // For backward compatibility
                        postedDate: getRelativeTime(item.created_at),
                        listedDate: getDaysSince(item.created_at)
                      }
                    });
                  }}
                >
                  <Image
                    source={{ uri: item.image_urls?.[0] || 'https://via.placeholder.com/150' }}
                    style={styles.fruitImage}
                    defaultSource={require('../../assets/fruit_placeholder.png')}
                  />
                  <View style={styles.fruitDetailsSection}>
                    <Text style={styles.fruitName}>{item.name}</Text>
                    <Text style={styles.fruitCategory}>Grade: {item.grade} • {item.type}</Text>

                    <View style={styles.locationRow}>
                      <Icon name="location-outline" size={12} color="#505050" />
                      <Text style={styles.fruitLocation}>
                        {formatLocation(item.location)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.fruitPrice}>
                      {formatPrice(item.price_per_kg)}
                    </Text>
                    <Text style={styles.fruitTons}>
                      {formatFruitQuantity(item.quantity)}
                    </Text>
                    {renderStars(4.8)} {/* Default rating for now */}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIcon}>
                  <Icon name="basket-outline" size={48} color="#CCCCCC" />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {searchQuery || selectedCategory !== 'all' ? 'No Matching Fruits' : 'No Fruits Available'}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your search or category filter'
                    : 'Fresh fruits will be listed here when farmers post them'
                  }
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                >
                  <Icon name="refresh-outline" size={18} color={Colors.light.primary} />
                  <Text style={styles.refreshButtonText}>
                    {searchQuery || selectedCategory !== 'all' ? 'Clear Filters' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Add a spacer view to ensure the last item has padding at the bottom */}
            <View style={{ flex: 1, paddingBottom: 40, backgroundColor: 'transparent' }}></View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeFilterModal}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderContent}>
                <TouchableOpacity
                  style={styles.modalBackButton}
                  onPress={closeFilterModal}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity
                  style={styles.modalClearButton}
                  onPress={() => {
                    clearAllFilters();
                    closeFilterModal();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalClearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FilterScreen
              onApplyFilters={handleApplyFilters}
              onClose={closeFilterModal}
              isModal={true}
            />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  fixedHeaderTitle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  fixedHeaderImage: {
    width: 160,
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageButton: {
    padding: 5, // Add padding to increase touch area
    borderRadius: 60,
  },
  profilePlaceholderButton: {
    padding: 5, // Add padding to increase touch area
    borderRadius: 60,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden', // Ensures the image stays within circular bounds
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    padding: 12,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F6F6F6', // Light background color
  },
  userInfo: {
    marginLeft: 12,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 13,
    color: '#505050',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationIconButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 25,
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#505050',
    height: 48,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterBtn: {
    backgroundColor: '#E8F5E8',
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  }, section: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  categoriesContainer: {
    padding: 4,
    paddingRight: 18,
    gap: 10,
  },
  selectedCategoryCard: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  selectedCategoryText: {
    fontWeight: '700',
  },
  categoryCard: {
    backgroundColor: '#F6F6F6',
    borderRadius: 25,
    paddingRight: 18,
    paddingLeft: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  categoryImage: {
    width: 42,
    height: 42,
    borderRadius: 24,
    marginRight: 10,
    resizeMode: 'cover',
  },
  categoryText: {
    fontSize: 15,
    color: '#505050',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fruitsContainer: {
    gap: 16,
    paddingVertical: 6,
  },
  fruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  fruitImage: {
    height: 70,
    width: 70,
    borderRadius: 10,
    marginRight: 14,
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
    fontSize: 11,
    color: '#939393',
    marginTop: 2,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginVertical: 8,
  },
  emptyStateIcon: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 50,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalClearButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  modalClearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  activeNavItem: {
    borderTopWidth: 3,
    borderTopColor: Colors.light.primaryDark,
  },
  navText: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },
  activeNavText: {
    fontSize: 12,
    color: Colors.light.primaryDark,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  }
});

export default BuyerHomeScreen;