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
import { useNavigation } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser } from '../../services/firebaseService';
import auth from '@react-native-firebase/auth';
import { Colors, Typography, Layout } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls';

const fruitCategories = [
  { name: 'All Fruits', icon: require('../../assets/Apple.png') },
  { name: 'Mangoes', icon: require('../../assets/hapus.jpeg') },
  { name: 'Apples', icon: require('../../assets/appleFruit.jpeg') },
  { name: 'Bananas', icon: require('../../assets/banana.png') },
];

// Current active listings by the farmer
const myActiveFruits = [
  {
    id: 1,
    name: 'Premium Hapus Mango',
    category: 'Mango',
    price: '₹120/KG',
    originalPrice: '₹150/KG',
    location: 'Ratnagiri, Maharashtra',
    available: '40-60 tons',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
    listedDate: '2 days ago',
    status: 'active',
    views: 127,
    inquiries: 8,
  },
  {
    id: 2,
    name: 'Sweet Banana',
    category: 'Banana',
    price: '₹80/KG',
    originalPrice: '₹95/KG',
    location: 'Paithan, Maharashtra',
    available: '25-35 tons',
    rating: 4.7,
    image: require('../../assets/banana.png'),
    listedDate: '1 day ago',
    status: 'active',
    views: 89,
    inquiries: 5,
  },
];

// Previous listings history
const myFruitHistory = [
  {
    id: 3,
    name: 'Alphonso Mango',
    category: 'Mango',
    price: '₹200/KG',
    originalPrice: '₹250/KG',
    location: 'Ratnagiri, Maharashtra',
    available: '0 tons',
    rating: 4.9,
    image: require('../../assets/hapus.jpeg'),
    listedDate: '1 week ago',
    status: 'sold_out',
    views: 245,
    inquiries: 15,
    soldQuantity: '12-18 tons',
  },
  {
    id: 4,
    name: 'Red Apple',
    category: 'Apple',
    price: '₹160/KG',
    originalPrice: '₹180/KG',
    location: 'Paithan, Maharashtra',
    available: '0 tons',
    rating: 4.5,
    image: require('../../assets/appleFruit.jpeg'),
    listedDate: '2 weeks ago',
    status: 'expired',
    views: 98,
    inquiries: 3,
    soldQuantity: '3-7 tons',
  },
  {
    id: 5,
    name: 'Premium Banana',
    category: 'Banana',
    price: '₹75/KG',
    originalPrice: '₹85/KG',
    location: 'Paithan, Maharashtra',
    available: '0 tons',
    rating: 4.6,
    image: require('../../assets/banana.png'),
    listedDate: '3 weeks ago',
    status: 'sold_out',
    views: 156,
    inquiries: 12,
    soldQuantity: '15-25 tons',
  },
];

const HEADER_MAX_HEIGHT = 158; // Maximum header height
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 95 : 75; // Minimum header height after scroll
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const FarmerHomeScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Fruits');
  const [watchlist, setWatchlist] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Make sure tab bar is visible
  useEffect(() => {
    showTabBar();
  }, []);

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
      setIsLoading(true);

      const user = auth().currentUser;
      if (!user) {
        console.log('❌ No authenticated user found in BuyerHomeScreen');
        handleUserValidationFailure();
        return;
      }

      console.log('📱 Loading user profile for:', user.uid);

      // First validate if the user still exists on Firebase server
      const isValidUser = await validateCurrentUser();
      if (!isValidUser) {
        console.log('❌ User validation failed, user may have been deleted');
        handleUserValidationFailure();
        return;
      }

      // Get complete user profile from Firestore/AsyncStorage
      const profile = await getCompleteUserProfile();

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
    Alert.alert(
      'Authentication Error',
      'Your session has expired or your account is no longer valid. Please sign in again.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to auth flow using our utility function
            import('../../utils/navigationUtils').then(
              ({ navigateToAuth }) => navigateToAuth()
            );
          }
        }
      ],
      { cancelable: false }
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
        <Image source={require('../../assets/icon.png')} style={styles.fixedHeaderImage} />
        <TouchableOpacity
          style={styles.notificationIconButton}
          onPress={() => safeNavigate('Notification')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="notifications-outline" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
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
                <TouchableOpacity
                  onPress={() => safeNavigate('ProfileScreen')}
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
                placeholder="Search fruits, farmers..."
                placeholderTextColor="#939393"
                style={styles.searchInput}
              />
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
                  selectedCategory === item.name && styles.selectedCategoryCard
                ]}
                onPress={() => setSelectedCategory(item.name)}
              >
                <Image source={item.icon} style={styles.categoryImage} />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item.name && styles.selectedCategoryText
                ]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* My Listings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Listings</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !showHistory && styles.activeTab]}
                onPress={() => setShowHistory(false)}
              >
                <Text style={[styles.tabText, !showHistory && styles.activeTabText]}>
                  Active ({myActiveFruits.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, showHistory && styles.activeTab]}
                onPress={() => setShowHistory(true)}
              >
                <Text style={[styles.tabText, showHistory && styles.activeTabText]}>
                  History ({myFruitHistory.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!showHistory ? (
            // Active Listings
            <View>
              {myActiveFruits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="leaf-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No Active Listings</Text>
                  <Text style={styles.emptyStateSubtext}>
                    You haven't listed any fruits yet.{'\n'}
                    Contact admin to add your harvest.
                  </Text>
                </View>
              ) : (
                <FlatList
                  key={selectedCategory} // Force re-render when category changes
                  data={myActiveFruits.filter(fruit => 
                    selectedCategory === 'All Fruits' || 
                    fruit.category.toLowerCase().includes(selectedCategory.toLowerCase().replace('s', ''))
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={styles.fruitRow}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.fruitCard}
                      activeOpacity={0.9}
                      onPress={() => safeNavigate('ProductDetailsFarmer', {
                        productId: item.id,
                        product: item
                      })}
                    >
                      <View style={styles.fruitImageContainer}>
                        <Image source={item.image} style={styles.fruitImage} />
                        <View style={styles.statusBadge}>
                          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                          <Text style={styles.statusText}>Live</Text>
                        </View>
                      </View>

                      <View style={styles.fruitDetails}>
                        <Text style={styles.fruitName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dateText}>{item.listedDate}</Text>
                        
                        <View style={styles.priceRow}>
                          <Text style={styles.fruitPrice}>{item.price}</Text>
                          <Text style={styles.originalPrice}>{item.originalPrice}</Text>
                        </View>

                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Icon name="eye-outline" size={12} color="#757575" />
                            <Text style={styles.statText}>{item.views}</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Icon name="chatbubble-outline" size={12} color="#757575" />
                            <Text style={styles.statText}>{item.inquiries}</Text>
                          </View>
                          <Text style={styles.availableText}>{item.available}</Text>
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
              {myFruitHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="time-outline" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>No History Yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Your past listings will appear here.{'\n'}
                    Start listing fruits to build your history.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={myFruitHistory}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.historyCard}
                      activeOpacity={0.7}
                      onPress={() => safeNavigate('ProductDetailsFarmer', {
                        productId: item.id,
                        product: item
                      })}
                    >
                      <Image source={item.image} style={styles.historyImage} />
                      <View style={styles.historyDetails}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyName} numberOfLines={1}>{item.name}</Text>
                          <View style={[styles.historyStatusBadge, 
                            item.status === 'sold_out' ? styles.soldOutBadge : styles.expiredBadge]}>
                            <Text style={[styles.historyStatusText,
                              item.status === 'sold_out' ? styles.soldOutText : styles.expiredText]}>
                              {item.status === 'sold_out' ? 'Sold Out' : 'Expired'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyDate}>{item.listedDate}</Text>
                        <Text style={styles.historyPrice}>{item.price}</Text>
                        
                        <View style={styles.historyStats}>
                          <View style={styles.historyStat}>
                            <Icon name="eye-outline" size={12} color="#757575" />
                            <Text style={styles.historyStatText}>{item.views} views</Text>
                          </View>
                          <View style={styles.historyStat}>
                            <Icon name="chatbubble-outline" size={12} color="#757575" />
                            <Text style={styles.historyStatText}>{item.inquiries} inquiries</Text>
                          </View>
                          {item.soldQuantity && (
                            <View style={styles.historyStat}>
                              <Icon name="checkmark-circle-outline" size={12} color="#4CAF50" />
                              <Text style={styles.historyStatText}>Sold {item.soldQuantity}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={styles.relistButton}>
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
    zIndex: 1000,
  },
  fixedHeaderImage: {
    width: 160,
    height: '100%',
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
    borderRadius: 60,
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
});

export default FarmerHomeScreen;