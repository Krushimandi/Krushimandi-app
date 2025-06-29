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

const categories = [
  { name: 'Fruits', icon: require('../../assets/Apple.png') },
  { name: 'Vegetables', icon: require('../../assets/spinach.jpg') },
  { name: 'Organics', icon: require('../../assets/banana.png') },
];

const products = [
  {
    id: 1,
    name: 'Premium Hapus Mango',
    category: 'Mango',
    price: '₹120/KG',
    originalPrice: '₹150/KG',
    location: 'Ratnagiri, Maharashtra',
    available: '500 kg',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
    seller: 'Kishor Patil',
    sellerRating: 4.7,
    sellerProducts: 15,
    organic: true,
  },
  {
    id: 2,
    name: 'Kashmiri Apple',
    category: 'Apple',
    price: '₹180/KG',
    originalPrice: '₹200/KG',
    location: 'Alshpur, Jammu',
    available: '250 kg',
    rating: 4.6,
    image: require('../../assets/appleFruit.jpeg'),
    seller: 'Ramesh Kumar',
    sellerRating: 4.5,
    sellerProducts: 8,
    organic: false,
  },
  {
    id: 3,
    name: 'Fresh Nashik Tomatoes',
    category: 'Vegetable',
    price: '₹60/KG',
    originalPrice: '₹75/KG',
    location: 'Nashik, Maharashtra',
    available: '300 kg',
    rating: 4.7,
    image: require('../../assets/hapus.jpeg'),
    seller: 'Sunil Jadhav',
    sellerRating: 4.9,
    sellerProducts: 22,
    organic: true,
  },
  {
    id: 4,
    name: 'Organic Spinach',
    category: 'Vegetable',
    price: '₹40/KG',
    originalPrice: '₹45/KG',
    location: 'Pune, Maharashtra',
    available: '100 kg',
    rating: 4.8,
    image: require('../../assets/spinach.jpg'),
    seller: 'Anita Patil',
    sellerRating: 4.8,
    sellerProducts: 12,
    organic: true,
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [watchlist, setWatchlist] = useState([]);
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
                  Hello, {getDisplayName()}!
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
                placeholder="Search produce, farmers..."
                placeholderTextColor="#939393"
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity style={styles.filterBtn}>
              <Icon name="options-outline" size={20} color={Colors.light.primaryDark} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => safeNavigate('Browse')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryCard,
                selectedCategory === 'All' && styles.selectedCategoryCard
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Icon name="apps-outline" size={22} color={"#505050"} style={styles.categoryIcon} />
              <Text style={[
                styles.categoryText,
                selectedCategory === 'All' && styles.selectedCategoryText
              ]}>All</Text>
            </TouchableOpacity>

            {categories.map((item, index) => (
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

        {/* Featured Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Items</Text>
            <TouchableOpacity onPress={() => safeNavigate('Browse')}>
              <Text style={styles.viewAll}>See more</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContainer}
          >
            {products.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.featuredCard}
                activeOpacity={0.9}
                onPress={() => safeNavigate('ProductFlow', {
                  screen: 'ProductDetail',
                  params: {
                    product: {
                      id: item.id,
                      name: item.name,
                      description: `Category: ${item.category}`,
                      price: parseFloat(item.price.replace('₹', '').replace('/KG', '')),
                      rating: item.rating,
                      reviewCount: Math.floor(item.rating * 10),
                      sizes: ['1 kg', '500 gm', '2 kg'],
                      freshness: 'Fresh',
                      details: `Seller: ${item.seller}. Available quantity: ${item.available}`,
                      image: item.image,
                      location: item.location,
                      postedDate: '3 days ago'
                    }
                  }
                })}
              >
                <View style={styles.featuredImageContainer}>
                  <Image source={item.image} style={styles.featuredImage} />
                  <TouchableOpacity
                    style={styles.watchlistButton}
                    onPress={() => toggleWatchlist(item.id)}
                  >
                    <Icon
                      name={watchlist.includes(item.id) ? "heart" : "heart-outline"}
                      size={18}
                      color={watchlist.includes(item.id) ? "#FF3B30" : "#757575"}
                    />
                  </TouchableOpacity>
                  {item.organic && (
                    <View style={styles.organicBadge}>
                      <Text style={styles.organicText}>Organic</Text>
                    </View>
                  )}
                </View>

                <View style={styles.featuredDetails}>
                  <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.featuredCategory}>{item.category}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.featuredPrice}>{item.price}</Text>
                    <Text style={styles.originalPrice}>{item.originalPrice}</Text>
                  </View>

                  <View style={styles.ratingRow}>
                    {renderStars(item.rating)}
                    <Text style={styles.locationText} numberOfLines={1}>
                      <Icon name="location-outline" size={10} color="#757575" /> {item.location.split(',')[0]}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Best Sellers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verified Farmers</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.farmersContainer}
          >
            {[1, 2, 3, 4].map((item) => (
              <TouchableOpacity key={item} style={styles.farmerCard} activeOpacity={0.9}>
                <View style={styles.farmerImageContainer}>
                  <Image source={require('../../assets/student.jpeg')} style={styles.farmerImage} />
                  <View style={styles.verifiedBadge}>
                    <Octicons name="verified" size={14} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.farmerName}>Raju Patil</Text>
                <Text style={styles.farmerLocation}>Nashik, MH</Text>
                <View style={styles.farmerRating}>
                  <Icon name="star" size={12} color="#FFB800" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recently Viewed */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentContainer}>
            {products.slice(0, 2).map((item) => (
              <TouchableOpacity
                key={item.id + "-recent"}
                style={styles.recentProductCard}
                activeOpacity={0.9}
                onPress={() => safeNavigate('ProductFlow', {
                  screen: 'ProductDetail',
                  params: { productId: item.id }
                })}
              >
                <Image source={item.image} style={styles.recentProductImage} />
                <View style={styles.recentProductDetails}>
                  <Text style={styles.recentProductName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.recentProductPrice}>{item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryDark,
  },
  categoriesContainer: {
    paddingVertical: 4,
    paddingRight: 18,
    gap: 10,
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
  categoryIcon: {
    marginLeft: 12,
    marginRight: 8,
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
    // color: Colors.light.primaryDark,
    fontWeight: '600',
  },
  featuredContainer: {
    paddingVertical: 6,
    paddingRight: 20,
    gap: 16,
  },
  featuredCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 16,
    overflow: 'hidden',
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  watchlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  organicBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  organicText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  featuredDetails: {
    padding: 12,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  featuredCategory: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#757575',
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 10,
    color: '#757575',
    maxWidth: '50%',
  },
  farmersContainer: {
    padding: 4,
    paddingRight: 20,
    gap: 16,
  },
  farmerCard: {
    alignItems: 'center',
    marginRight: 20,
  },
  farmerImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  farmerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  farmerLocation: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  farmerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#505050',
    fontWeight: '500',
  },
  recentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recentProductCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  recentProductImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  recentProductDetails: {
    padding: 10,
  },
  recentProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  recentProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
});

export default FarmerHomeScreen;