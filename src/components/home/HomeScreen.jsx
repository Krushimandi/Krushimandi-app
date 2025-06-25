// FarmerHomeScreen.js
// A specialized home screen for farmer users

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
import { useNavigation } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser } from '../../services/firebaseService';
import auth from '@react-native-firebase/auth';
import { Colors, Typography, Layout } from '../../constants';

const categories = [
  { name: 'Bananas', icon: require('../../assets/banana.png') },
  { name: 'Apples', icon: require('../../assets/Apple.png') },
  { name: 'Spinach', icon: require('../../assets/spinach.jpg') },
];

const fruits = [
  {
    id: 1,
    name: 'Hapus Amba',
    category: 'Mango',
    price: '₹50/KG',
    location: 'Ratnagiri, Maharashtra',
    tons: '10–12 Tons',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
  },
  {
    id: 2,
    name: 'Kashmiri Apple',
    category: 'Apple',
    price: '₹50/KG',
    location: 'Alshpur, Jammu',
    tons: '10–12 Tons',
    rating: 4.6,
    image: require('../../assets/appleFruit.jpeg'),
  },
  {
    id: 3,
    name: 'Hapus Amba',
    category: 'Mango',
    price: '₹50/KG',
    location: 'Nashik, Maharashtra',
    tons: '10–12 Tons',
    rating: 4.7,
    image: require('../../assets/hapus.jpeg'),
  },
  {
    id: 4,
    name: 'Hapus Amba',
    category: 'Mango',
    price: '₹50/KG',
    location: 'Ratnagiri, Maharashtra',
    tons: '10–12 Tons',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
  },
  {
    id: 5,
    name: 'Hapus Amba',
    category: 'Mango',
    price: '₹50/KG',
    location: 'Ratnagiri, Maharashtra',
    tons: '10–12 Tons',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
  },
  {
    id: 6,
    name: 'Hapus Amba',
    category: 'Mango',
    price: '₹50/KG',
    location: 'Ratnagiri, Maharashtra',
    tons: '10–12 Tons',
    rating: 4.8,
    image: require('../../assets/hapus.jpeg'),
  },
];

const HEADER_MAX_HEIGHT = 158; // Maximum header height
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 95 : 75; // Minimum header height after scroll
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

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
    console.log("clicked");

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
        console.log('❌ No authenticated user found in HomeScreen');
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
  };  const handleUserValidationFailure = () => {
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
            console.log('Opening notifications from header');
            navigation.navigate('Notification'); // Navigate to Notification screen
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
                      onPress={() => {
                        safeNavigate('ProfileScreen');
                      }}
                      source={{ uri: userProfile.profileImage }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profilePlaceholderButton} onPress={() => {
                    console.log('Navigating to Profile from placeholder');
                    safeNavigate('ProfileScreen');
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.profilePlaceholder} onPress={() => {
                    safeNavigate('ProfileScreen');
                  }}>
                    <Octicons
                      name="person"
                      size={24}
                      color="#000"
                    />
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.userInfo} onPress={() => {
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
              <TouchableOpacity key={index} style={styles.categoryCard}>
                <Image source={item.icon} style={styles.categoryImage} />
                <Text style={styles.categoryText}>{item.name}</Text>
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
            {fruits.map((item) => (<TouchableOpacity
              key={item.id}
              style={styles.fruitCard} activeOpacity={0.9} onPress={() => {
                // Navigate to the ProductDetail screen in the nested ProductFlowNavigator
                safeNavigate('ProductFlow', {
                  screen: 'ProductDetail',
                  params: {
                    product: {
                      name: item.name,
                      description: `Category: ${item.category}`,
                      price: parseFloat(item.price.replace('₹', '').replace('/KG', '')),
                      rating: item.rating,
                      reviewCount: Math.floor(item.rating * 10),
                      sizes: ['1 kg', '500 gm', '2 kg'],
                      freshness: 'Fresh',
                      details: `${item.name} from ${item.location}. Available quantity: ${item.tons}`,
                      image: item.image,
                      postedDate: '3 days ago' // Add postedDate for the badge
                    }
                  }
                });
              }}
            >
              <Image source={item.image} style={styles.fruitImage} />

              <View style={styles.fruitDetailsSection}>
                <Text style={styles.fruitName}>{item.name}</Text>
                <Text style={styles.fruitCategory}>Category: {item.category}</Text>

                <View style={styles.locationRow}>
                  <Icon name="location-outline" size={12} color="#505050" />
                  <Text style={styles.fruitLocation}>{item.location}</Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.fruitPrice}>{item.price}</Text>
                <Text style={styles.fruitTons}>{item.tons}</Text>
                {renderStars(item.rating)}
              </View>
            </TouchableOpacity>
            ))}
          </View>
        </View>      </Animated.ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Icon name="home" size={22} color={Colors.light.primaryDark} />
          <Text style={styles.activeNavText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon name="add-circle" size={40} color="#CCCCCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon name="cart-outline" size={22} color="#CCCCCC" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
      </View>
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
  }, notificationIcon: {
    padding: 10,
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
  categoryCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 25,
    paddingRight: 18,
    paddingLeft: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  }, fruitsContainer: {
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
  }, bottomNavigation: {
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

export default HomeScreen;
