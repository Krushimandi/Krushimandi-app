import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser } from '../../services/firebaseService';
import { getFruitsByFarmer, getFruitsByFarmerOptimized, createFruit, updateFruitStatus } from '../../services/fruitService';
import auth from '@react-native-firebase/auth';
import { Colors, Typography, Layout } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls';
import { Fruit } from '../../types/fruit';
import { FruitType } from '../../types/fruit';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation,
  getRelativeTime
} from '../../utils/formatters';
import { RefreshControl } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

const fruitCategories = [
  { name: 'All Fruits', type: 'all', icon: null },
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

const FarmerHomeScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [watchlist, setWatchlist] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeFruits, setActiveFruits] = useState([]);
  const [fruitHistory, setFruitHistory] = useState([]);
  const [loadingFruits, setLoadingFruits] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Make sure tab bar is visible when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );

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
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.7, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1], // Hidden until 70% of scroll, then fade in quickly
    extrapolate: 'clamp',
  });

  const isVisible = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleIndex = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 20, 40], // Higher values but still below normal header
    extrapolate: 'clamp',
  });


  // Always fetch fresh profile on mount
  useEffect(() => {
    loadUserProfile(true);
  }, []);

  // Always fetch fresh profile on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile(true);
      showTabBar();
    }, [showTabBar])
  );

  // Safe navigation function to prevent "route not defined" errors
  const safeNavigate = (routeName, params = {}) => {
    try {
      navigation.navigate(routeName, params);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', `Cannot navigate to ${routeName}. This screen may not be available.`);
    }
  };

  const loadUserProfile = async (forceRefresh = false) => {
    try {
      setIsLoading(true);

      const user = auth().currentUser;
      if (!user) {
        console.log('❌ No authenticated user found in BuyerHomeScreen');
        handleUserValidationFailure();
        return;
      }

      console.log('📱 Loading user profile for:', user.uid, forceRefresh ? '(force refresh)' : '');

      // First validate if the user still exists on Firebase server
      const isValidUser = await validateCurrentUser();
      if (!isValidUser) {
        console.log('❌ User validation failed, user may have been deleted');
        handleUserValidationFailure();
        return;
      }

      // Get complete user profile from Firestore/AsyncStorage, force refresh if needed
      const profile = await getCompleteUserProfile(forceRefresh);

      if (profile) {
        setUserProfile(profile);
        console.log('✅ User profile loaded:', {
          name: profile.firstName,
          role: profile.userRole,
          hasAvatar: !!profile.profileImage,
          isComplete: profile.isProfileComplete
        });

        // Update last login in background
        if (profile.uid && profile.userRole) {
          updateLastLogin(profile.uid, profile.userRole).catch(console.error);
        }
      } else {
        console.log('❌ No user profile found, user may need to complete registration');
        handleUserValidationFailure();
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      handleUserValidationFailure();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserValidationFailure = () => {
    // Navigate back to auth flow using our utility function
    navigation.then(
      ({ navigateToAuth }) => navigateToAuth()
    );
    Toast.show({
      type: 'error',
      position: 'bottom',
      text1: "logged out",
      text2: "Your session has expired or your account is no longer valid. Please sign in again."
    });
  };

  // Get display name for greeting
  const getDisplayName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (userProfile?.displayName) {
      return userProfile.displayName.split(' ')[0];
    }
    return 'there';
  };

  // Toggle product in watchlist
  const toggleWatchlist = (productId) => {
    if (watchlist.includes(productId)) {
      setWatchlist(watchlist.filter(id => id !== productId));
    } else {
      setWatchlist([...watchlist, productId]);
    }
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

  // Load farmer's fruits from Firebase
  const loadFarmerFruits = async () => {
    try {
      if (!userProfile?.uid) {
        console.log('❌ No user profile available for loading fruits');
        return;
      }

      setLoadingFruits(true);
      console.log('🔄 Loading farmer fruits for user:', userProfile.uid);

      // Load active fruits using optimized method
      const activeData = await getFruitsByFarmerOptimized(userProfile.uid, 'active');
      console.log('✅ Loaded active fruits:', activeData.length, activeData);
      setActiveFruits(activeData || []);

      // Load fruit history (sold/inactive fruits) using optimized method
      const allFruitsData = await getFruitsByFarmerOptimized(userProfile.uid);
      const history = (allFruitsData || []).filter(fruit => fruit.status !== 'active');
      console.log('✅ Loaded fruit history:', history.length, history);
      setFruitHistory(history);

      console.log('✅ Farmer fruits loaded successfully:', {
        active: activeData?.length || 0,
        history: history?.length || 0,
        total: allFruitsData?.length || 0
      });
    } catch (error) {
      console.error('❌ Error loading farmer fruits:', error);
      // Show error to user but don't fallback to dummy data
      Alert.alert(
        'Error Loading Fruits',
        'Unable to load your fruit listings. Please check your internet connection and try again.',
        [
          { text: 'OK', onPress: () => { } },
          { text: 'Retry', onPress: () => loadFarmerFruits() }
        ]
      );
      // Set empty arrays instead of sample data
      setActiveFruits([]);
      setFruitHistory([]);
    } finally {
      setLoadingFruits(false);
    }
  };

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    if (userProfile?.uid) {
      await loadUserProfile(true); // Always force refresh on pull-to-refresh
      await loadFarmerFruits();
    }
  };

  // Add loading indicator component
  const LoadingFruits = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <Icon name="leaf-outline" size={48} color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading your fruits...</Text>
      </View>
    </View>
  );

  // Load fruits when user profile is loaded
  useEffect(() => {
    if (userProfile?.uid) {
      console.log('👤 User profile loaded, loading fruits for:', userProfile.uid);
      loadFarmerFruits();
    } else {
      console.log('👤 No user profile available yet');
    }
  }, [userProfile?.uid]);

  // Debug log for fruits data
  useEffect(() => {
    console.log('📊 Fruits state updated:', {
      activeFruits: activeFruits.length,
      activeData: activeFruits,
      fruitHistory: fruitHistory.length,
      historyData: fruitHistory,
      loadingFruits
    });
  }, [activeFruits, fruitHistory, loadingFruits]);

  // Debug log for category filtering
  useEffect(() => {
    const filteredCount = activeFruits.filter(fruit =>
      selectedCategory === 'all' ||
      fruit.type.toLowerCase() === selectedCategory.toLowerCase()
    ).length;

    console.log('🔍 Category Filter Debug:', {
      selectedCategory,
      totalActiveFruits: activeFruits.length,
      filteredCount,
      sampleFruitTypes: activeFruits.slice(0, 3).map(f => f.type)
    });
  }, [selectedCategory, activeFruits]);



  // Handle fruit status updates (mark as sold, inactive, etc.)
  const handleFruitStatusUpdate = async (fruitId, newStatus) => {
    try {
      console.log('🔄 Updating fruit status...', { fruitId, newStatus });

      await updateFruitStatus(fruitId, newStatus);

      // Reload fruits to reflect changes
      await loadFarmerFruits();

      const statusMessage = newStatus === 'sold' ? 'marked as sold' :
        newStatus === 'inactive' ? 'deactivated' :
          'updated';

      Alert.alert('Success', `Fruit ${statusMessage} successfully!`);
    } catch (error) {
      console.error('❌ Error updating fruit status:', error);
      Alert.alert('Error', 'Failed to update fruit status: ' + error.message);
    }
  };

  // Handle marking a fruit as sold
  const markFruitAsSold = (fruit) => {
    Alert.alert(
      'Mark as Sold',
      `Are you sure you want to mark "${fruit.name}" as sold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sold',
          style: 'destructive',
          onPress: () => handleFruitStatusUpdate(fruit.id, 'sold')
        }
      ]
    );
  };

  // Handle reactivating a fruit
  const reactivateFruit = (fruit) => {
    Alert.alert(
      'Reactivate Listing',
      `Do you want to reactivate "${fruit.name}" listing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: () => handleFruitStatusUpdate(fruit.id, 'active')
        }
      ]
    );
  };

  // Filter fruits based on search query and category
  const getFilteredFruits = (fruits) => {
    let filtered = fruits;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(fruit =>
        fruit.type.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(fruit => {
        const fruitName = (fruit.name || '').toLowerCase();
        const fruitType = (fruit.type || '').toLowerCase();
        const fruitDescription = (fruit.description || '').toLowerCase();
        const location = `${fruit.location?.village || ''} ${fruit.location?.district || ''} ${fruit.location?.state || ''}`.toLowerCase();
        const grade = (fruit.grade || '').toLowerCase();

        return (
          fruitName.includes(query) ||
          fruitType.includes(query) ||
          fruitDescription.includes(query) ||
          location.includes(query) ||
          grade.includes(query)
        );
      });
    }

    return filtered;
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#FFFFFF"
        translucent={true}
        barStyle="dark-content"
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        refreshing={loadingFruits}
        onRefresh={handleRefresh}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={loadingFruits}
            onRefresh={handleRefresh}
            colors={[Colors.light.primary]}
            progressBackgroundColor="#FFFFFF"
          />
        }
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
                <TouchableOpacity
                  onPress={() => safeNavigate('ProfileScreen')}
                  style={styles.profileImageButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Image
                    pointerEvents="none"
                    source={{ uri: userProfile.profileImage }}
                    style={styles.profileImage}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profilePlaceholderButton}
                  onPress={() => safeNavigate('ProfileScreen')}
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
                onPress={() => safeNavigate('ProfileScreen')}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 0, right: 10 }}
              >
                <Text style={styles.welcome}>
                  Namste, {getDisplayName()}!
                </Text>
                <View style={styles.locationContainer}>
                  <Text style={styles.location}>
                    Paithan, Maharashtra
                  </Text>
                  <Icon name="chevron-down" size={12} color="#505050" />
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => safeNavigate('Notification')}
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
                placeholder="Search fruits, location, grade..."
                placeholderTextColor="#939393"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearch}
                  style={styles.clearSearchButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={18} color="#939393" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.filterBtn}>
              <Icon name="options-outline" size={20} color={Colors.light.primaryDark} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Fruit Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fruit Categories</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {fruitCategories.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryCard,
                  selectedCategory === item.type && styles.selectedCategoryCard
                ]}
                onPress={() => setSelectedCategory(item.type)}
              >

                {item.name === 'All Fruits' ? (
                  <Icon name="apps-outline" size={22} color={"#505050"} style={[styles.categoryIcon, {
                    marginHorizontal: 6,
                  }]} />
                ) : (
                  <Image source={item.icon} style={styles.categoryImage} />
                )}
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item.type && styles.selectedCategoryText
                ]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* My Listings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>My Listings</Text>
              {(searchQuery || selectedCategory !== 'all') && (
                <Text style={styles.searchResultsText}>
                  {searchQuery && `"${searchQuery}" • `}
                  {selectedCategory !== 'all' && `${selectedCategory} • `}
                  {!showHistory ? getFilteredFruits(activeFruits).length : getFilteredFruits(fruitHistory).length} results
                </Text>
              )}
            </View>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !showHistory && styles.activeTab]}
                onPress={() => setShowHistory(false)}
              >
                <Text style={[styles.tabText, !showHistory && styles.activeTabText]}>
                  Active ({getFilteredFruits(activeFruits).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, showHistory && styles.activeTab]}
                onPress={() => setShowHistory(true)}
              >
                <Text style={[styles.tabText, showHistory && styles.activeTabText]}>
                  History ({getFilteredFruits(fruitHistory).length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!showHistory ? (
            // Active Listings
            <View>
              {loadingFruits ? (
                <LoadingFruits />
              ) : activeFruits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="leaf-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No Active Listings</Text>
                  <Text style={styles.emptyStateSubtext}>
                    You haven't listed any fruits yet.{'\n'}
                    Start by adding your first fruit listing.
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                  >
                    <Icon name="refresh-outline" size={20} color='#505050' />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : getFilteredFruits(activeFruits).length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="search-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No Results Found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? `No fruits match "${searchQuery}"` : `No ${selectedCategory === 'all' ? '' : selectedCategory + ' '}fruits found`}
                    {'\n'}Try adjusting your search or filters.
                  </Text>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                    >
                      <Icon name="refresh-outline" size={20} color='#505050' />
                      <Text style={styles.refreshButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  key={selectedCategory} // Force re-render when category changes
                  data={getFilteredFruits(activeFruits)}
                  keyExtractor={(item) => item.id || item._id || `fruit_${Math.random()}`}
                  numColumns={2}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={styles.fruitRow}
                  refreshing={loadingFruits}
                  onRefresh={handleRefresh}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.fruitCard}
                      activeOpacity={0.9}
                      onPress={() => safeNavigate('ProductDetailsFarmer', {
                        productId: item.id,
                        product: item
                      })}
                      onLongPress={() => markFruitAsSold(item)}
                    >
                      <View style={styles.fruitImageContainer}>
                        <Image
                          source={{
                            uri: (item.image_urls && item.image_urls[0]) || 'https://via.placeholder.com/150'
                          }}
                          style={styles.fruitImage}
                          defaultSource={require('../../assets/fruits/banana.png')}
                          onError={(error) => {
                            console.log('Image load error for fruit:', item.id, error);
                          }}
                        />
                        <View style={styles.statusBadge}>
                          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                          <Text style={styles.statusText}>Live</Text>
                        </View>
                      </View>

                      <View style={styles.fruitDetails}>
                        <Text style={styles.fruitName} numberOfLines={1}>
                          {item.name || 'Unnamed Fruit'}
                        </Text>
                        <Text style={styles.dateText}>
                          {getRelativeTime(item.created_at || new Date().toISOString())}
                        </Text>

                        <View style={styles.priceRow}>
                          <Text style={styles.fruitPrice}>
                            {formatPrice(item.price_per_kg || 0)}
                          </Text>
                          <Text style={styles.gradeText}>Grade {item.grade || 'A'}</Text>
                        </View>

                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Icon name="eye-outline" size={12} color="#757575" />
                            <Text style={styles.statText}>{item.views || 0}</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Icon name="heart-outline" size={12} color="#757575" />
                            <Text style={styles.statText}>{item.likes || 0}</Text>
                          </View>
                          <Text style={styles.availableText}>
                            {formatFruitQuantity(item.quantity || [0, 0])}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          ) : (
            // History Listings
            <View>
              {loadingFruits ? (
                <LoadingFruits />
              ) : fruitHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="time-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No History Yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Your past listings will appear here.{'\n'}
                    Start listing fruits to build your history.
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                  >
                    <Icon name="refresh-outline" size={20} color='#505050' />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : getFilteredFruits(fruitHistory).length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="search-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No Results Found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? `No history matches "${searchQuery}"` : `No ${selectedCategory === 'all' ? '' : selectedCategory + ' '}history found`}
                    {'\n'}Try adjusting your search or filters.
                  </Text>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                    >
                      <Icon name="refresh-outline" size={20} color='#505050' />
                      <Text style={styles.refreshButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  data={getFilteredFruits(fruitHistory)}
                  keyExtractor={(item) => item.id || item._id || `history_${Math.random()}`}
                  showsVerticalScrollIndicator={false}
                  refreshing={loadingFruits}
                  onRefresh={handleRefresh}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.historyCard}
                      activeOpacity={0.7}
                      onPress={() => safeNavigate('ProductDetailsFarmer', {
                        productId: item.id,
                        product: item
                      })}
                    >
                      <Image
                        source={{
                          uri: (item.image_urls && item.image_urls[0]) || 'https://via.placeholder.com/150'
                        }}
                        style={styles.historyImage}
                        defaultSource={require('../../assets/fruits/banana.png')}
                        onError={(error) => {
                          console.log('History image load error for fruit:', item.id, error);
                        }}
                      />
                      <View style={styles.historyDetails}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyName} numberOfLines={1}>
                            {item.name || 'Unnamed Fruit'}
                          </Text>
                          <View style={[styles.historyStatusBadge,
                          item.status === 'sold' ? styles.soldOutBadge : styles.expiredBadge]}>
                            <Text style={[styles.historyStatusText,
                            item.status === 'sold' ? styles.soldOutText : styles.expiredText]}>
                              {item.status === 'sold' ? 'Sold Out' : 'Expired'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyDate}>
                          {getRelativeTime(item.created_at || new Date().toISOString())}
                        </Text>
                        <Text style={styles.historyPrice}>
                          {formatPrice(item.price_per_kg || 0)}
                        </Text>

                        <View style={styles.historyStats}>
                          <View style={styles.historyStat}>
                            <Icon name="eye-outline" size={12} color="#757575" />
                            <Text style={styles.historyStatText}>{item.views || 0} views</Text>
                          </View>
                          <View style={styles.historyStat}>
                            <Icon name="heart-outline" size={12} color="#757575" />
                            <Text style={styles.historyStatText}>{item.likes || 0} likes</Text>
                          </View>
                          <View style={styles.historyStat}>
                            <Icon name="location-outline" size={12} color="#757575" />
                            <Text style={styles.historyStatText}>
                              {formatLocation(item.location || {})}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.relistButton}
                        onPress={() => reactivateFruit(item)}
                      >
                        <Icon name="refresh-outline" size={16} color={Colors.light.primary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Fixed Header Title - Initially hidden, shows only when user scrolls significantly */}
      <Animated.View
        style={[
          styles.fixedHeaderTitle,
          {
            opacity: titleOpacity, // Will be 0 initially, becomes visible on scroll
            transform: [
              {
                translateY: titleOpacity.interpolate({
                  inputRange: [0, 0.1, 1],
                  outputRange: [-56, -56, 0], // Slide down from hidden position
                  extrapolate: 'clamp',
                })
              }
            ],
          },
          // Only enable pointer events when significantly visible
          titleOpacity.__getValue() > 0.3 ? {} : { pointerEvents: 'none' },
        ]}>
        <Image source={require('../../assets/icon.png')} style={styles.fixedHeaderImage} />
        <TouchableOpacity
          style={styles.notificationIconButton}
          onPress={() => safeNavigate('Notification')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
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
    position: 'relative',
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
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
    padding: 5,
    borderRadius: 30,
  },
  profilePlaceholderButton: {
    padding: 5,
    borderRadius: 60,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
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
    backgroundColor: '#F6F6F6',
  },
  userInfo: {
    marginLeft: 12,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    marginBottom: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 13,
    color: '#505050',
    marginRight: 4,
  },
  notificationIconButton: {
    padding: 5,
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
  },
  clearSearchButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
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
  },
  section: {
    paddingHorizontal: 10,
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
  },
  searchResultsText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
    fontStyle: 'italic',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryDark,
  },
  categoriesContainer: {
    paddingVertical: 4,
    paddingRight: 18,
    gap: 12,
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
  selectedCategoryCard: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
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
    fontWeight: '500',
  },
  selectedCategoryText: {
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  fruitRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fruitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: '1%',
    overflow: 'hidden',
  },
  fruitImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  fruitImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
  },
  fruitDetails: {
    padding: 12,
  },
  fruitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fruitPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    marginRight: 6,
  },
  gradeText: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '500',
  },
  originalPrice: {
    fontSize: 11,
    color: '#757575',
    textDecorationLine: 'line-through',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#757575',
    marginLeft: 2,
  },
  availableText: {
    fontSize: 9,
    color: '#757575',
    fontWeight: '500',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: '1%',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  historyStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  soldOutBadge: {
    backgroundColor: '#E8F5E8',
  },
  expiredBadge: {
    backgroundColor: '#FFF3E0',
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  soldOutText: {
    color: '#4CAF50',
  },
  expiredText: {
    color: '#FF9800',
  },
  historyDate: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 4,
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    marginBottom: 6,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStatText: {
    fontSize: 10,
    color: '#757575',
    marginLeft: 2,
  },
  relistButton: {
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#505050',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FarmerHomeScreen;