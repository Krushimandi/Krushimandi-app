import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Platform,
  SafeAreaView,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser, updateUserProfile, updateUserLocation, isNetworkAvailable } from '../../services/firebaseService';
import { getFruitsByFarmerOptimized, updateFruitStatus } from '../../services/fruitService';
import { auth } from '../../config/firebaseModular';
import { Colors, } from '../../constants';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { getHeaderConstants } from '../../constants/Layout';
import { useTabBarControl } from '../../utils/navigationControls';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation,
  getRelativeTime
} from '../../utils/formatters';
import { RefreshControl } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import ErrorBoundary from '../common/ErrorBoundary';
import { getLocationWithCache, getCurrentLocation, getFastLocation } from '../../utils/permissions';
import { initializeLocationCache } from '../../utils/locationCache';
import { useTranslation } from 'react-i18next';
import { NotificationBadge } from 'components/common';

const fruitCategories = [
  { name: 'All Fruits', type: 'all', icon: null, labelKey: 'fruits.all' },
  { name: 'Banana', type: 'banana', icon: require('../../assets/fruits/banana.png'), labelKey: 'fruits.banana' },
  { name: 'Orange', type: 'orange', icon: require('../../assets/fruits/orange.png'), labelKey: 'fruits.orange' },
  { name: 'Grape', type: 'grape', icon: require('../../assets/fruits/grapes.png'), labelKey: 'fruits.grape' },
  { name: 'Pomegranate', type: 'pomegranate', icon: require('../../assets/fruits/pomegranate.png'), labelKey: 'fruits.pomegranate' },
  { name: 'Sweet Lemon', type: 'sweet lemon', icon: require('../../assets/fruits/sweetlemon.png'), labelKey: 'fruits.sweetLemon' },
  { name: 'Apple', type: 'apple', icon: require('../../assets/fruits/Apple.png'), labelKey: 'fruits.apple' },
  { name: 'Mango', type: 'mango', icon: require('../../assets/fruits/mango.png'), labelKey: 'fruits.mango' },
];

// Sort options with security validation
const sortOptions = [
  {
    key: 'newest',
    label: 'Newest First',
    labelKey: 'sortLabels.newest',
    icon: 'time-outline',
    description: 'Most recently added',
    descriptionKey: 'sortDescriptions.newest',
    sortFn: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  },
  {
    key: 'oldest',
    label: 'Oldest First',
    labelKey: 'sortLabels.oldest',
    icon: 'hourglass-outline',
    description: 'Earliest listings first',
    descriptionKey: 'sortDescriptions.oldest',
    sortFn: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  },
  {
    key: 'price_high',
    label: 'Price: High to Low',
    labelKey: 'sortLabels.price_high',
    icon: 'trending-up-outline',
    description: 'Highest price first',
    descriptionKey: 'sortDescriptions.price_high',
    sortFn: (a, b) => (parseFloat(b.price_per_kg) || 0) - (parseFloat(a.price_per_kg) || 0)
  },
  {
    key: 'price_low',
    label: 'Price: Low to High',
    labelKey: 'sortLabels.price_low',
    icon: 'trending-down-outline',
    description: 'Lowest price first',
    descriptionKey: 'sortDescriptions.price_low',
    sortFn: (a, b) => (parseFloat(a.price_per_kg) || 0) - (parseFloat(b.price_per_kg) || 0)
  },
  {
    key: 'views',
    label: 'Most Viewed',
    labelKey: 'sortLabels.views',
    icon: 'eye-outline',
    description: 'Popular listings first',
    descriptionKey: 'sortDescriptions.views',
    sortFn: (a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0)
  },
  {
    key: 'likes',
    label: 'Most Liked',
    labelKey: 'sortLabels.likes',
    icon: 'heart-outline',
    description: 'Most appreciated listings',
    descriptionKey: 'sortDescriptions.likes',
    sortFn: (a, b) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0)
  },
  {
    key: 'quantity',
    label: 'Most Available',
    labelKey: 'sortLabels.quantity',
    icon: 'layers-outline',
    description: 'Largest quantity first',
    descriptionKey: 'sortDescriptions.quantity',
    sortFn: (a, b) => {
      const qtyA = Array.isArray(a.quantity) ? Math.max(...a.quantity.filter(q => !isNaN(q))) : (parseFloat(a.quantity) || 0);
      const qtyB = Array.isArray(b.quantity) ? Math.max(...b.quantity.filter(q => !isNaN(q))) : (parseFloat(b.quantity) || 0);
      return qtyB - qtyA;
    }
  },
  {
    key: 'alphabetical',
    label: 'A to Z',
    labelKey: 'sortLabels.alphabetical',
    icon: 'text-outline',
    description: 'Alphabetical order',
    descriptionKey: 'sortDescriptions.alphabetical',
    sortFn: (a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
  },
];

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FarmerHomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const insets = useSafeAreaInsets();
  const headerConstants = getHeaderConstants(insets.top);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [watchlist, setWatchlist] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeFruits, setActiveFruits] = useState([]);
  const [fruitHistory, setFruitHistory] = useState([]);
  const [loadingFruits, setLoadingFruits] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFixedHeaderVisible, setIsFixedHeaderVisible] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  // Prevent premature logout due to transient null firebase user (race/offline)
  const userValidationAttempts = useRef(0);
  const validatingUserRef = useRef(false);
  // Location modal state and animation
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const locationTapAnim = useRef(new Animated.Value(0)).current;

  const onLocationPress = useCallback(() => {
    locationTapAnim.setValue(0);
    Animated.sequence([
      Animated.timing(locationTapAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(locationTapAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setIsLocationModalVisible(true), 90);
  }, [locationTapAnim]);

  const locationAnimatedStyle = useMemo(() => ({
    transform: [{
      scale: locationTapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] })
    }],
    opacity: locationTapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] })
  }), [locationTapAnim]);

  React.useEffect(() => {
    changeNavigationBarColor('#ffffff', false);
    // 1st arg = color
    // 2nd arg = light/dark icons (true = light icons, false = dark icons)
  }, []);

  // Initialize background location cache on mount
  useEffect(() => {
    initializeLocationCache();
  }, []);

  // Calculate header height and opacity based on scroll with proper constants
  const headerHeight = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [headerConstants.HEADER_MAX_HEIGHT, headerConstants.HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.3, headerConstants.HEADER_SCROLL_DISTANCE * 0.8],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.5, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [15, 0],
    extrapolate: 'clamp',
  });

  // Fixed header shadow opacity
  const fixedHeaderShadowOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.7, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 0.1],
    extrapolate: 'clamp',
  });

  // Fixed header border opacity
  const fixedHeaderBorderOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.85, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Fixed header elevation for Android
  const fixedHeaderElevation = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.8, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 8],
    extrapolate: 'clamp',
  });


  // Always fetch fresh profile on mount
  useEffect(() => {
    let isMounted = true;

    const initializeScreen = async () => {
      if (isMounted) {
        await loadUserProfile(true);
      }
    };

    initializeScreen();

    return () => {
      isMounted = false;
    };
  }, []);

  // Always fetch fresh profile on screen focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const handleFocus = async () => {
        showTabBar();
        if (isMounted && userProfile?.uid) {
          await loadUserProfile(true);
        }
      };

      handleFocus();

      return () => {
        isMounted = false;
      };
    }, [showTabBar, userProfile?.uid])
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

      const user = auth.currentUser;
      if (!user) {
        // Guard: avoid immediate navigation reset if offline or early mount
        const online = await isNetworkAvailable().catch(() => false);
        userValidationAttempts.current += 1;
        if (!online && userValidationAttempts.current <= 5) {
          // Likely offline; keep session and retry later
          setTimeout(() => loadUserProfile(forceRefresh), 600);
          return;
        }
        if (userValidationAttempts.current <= 3) {
          // Race condition: retry a few times before declaring failure
          setTimeout(() => loadUserProfile(forceRefresh), 400 * userValidationAttempts.current);
          return;
        }
        // removed debug log
        handleUserValidationFailure();
        return;
      }

      // removed debug log

      // First validate if the user still exists on Firebase server
      if (!validatingUserRef.current) {
        validatingUserRef.current = true;
        const isValidUser = await validateCurrentUser();
        validatingUserRef.current = false;
        if (!isValidUser) {
          // removed debug log
          // Extra safeguard: only logout if online to avoid offline false negatives
          const online = await isNetworkAvailable().catch(() => false);
          if (online) {
            handleUserValidationFailure();
            return;
          } else {
            // removed debug log
          }
        }
      }

      // Always check for remote changes and sync if needed
      let profile;
      if (forceRefresh) {
        profile = await updateUserProfile();
      } else {
        profile = await getCompleteUserProfile(false);
      }

      if (profile) {
        setUserProfile(profile);

        // Update last login in background
        if (profile.uid && profile.userRole) {
          updateLastLogin(profile.uid, profile.userRole).catch(console.error);
        }
      } else {
        // removed debug log
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
    // Fixed navigation - using proper reset navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });

    // removed debug log
  };

  // Get display name for greeting - memoized to prevent recalculations
  const getDisplayName = useMemo(() => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (userProfile?.displayName) {
      return userProfile.displayName.split(' ')[0];
    }
    return 'there';
  }, [userProfile?.firstName, userProfile?.displayName]);

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

  // Load farmer's fruits from Firebase with cleanup
  const loadFarmerFruits = useCallback(async () => {
    let isMounted = true;

    try {
      if (!userProfile?.uid) {
        // removed debug log
        return;
      }

      if (isMounted) setLoadingFruits(true);

      // Load active fruits using optimized method
      const activeData = await getFruitsByFarmerOptimized(userProfile.uid, 'active');
      if (isMounted) {
        setActiveFruits(activeData || []);
      }

      // Load fruit history (sold/inactive fruits) using optimized method
      const allFruitsData = await getFruitsByFarmerOptimized(userProfile.uid);
      const history = (allFruitsData || []).filter(fruit => fruit.status !== 'active');
      if (isMounted) {
        setFruitHistory(history);
      }
    } catch (error) {
      console.error('❌ Error loading farmer fruits:', error);
      if (isMounted) {
        // Show error to user but don't fallback to dummy data
        Alert.alert(
          t('farmerHome.errorLoadingFruitsTitle'),
          t('farmerHome.errorLoadingFruitsMessage'),
          [
            { text: t('farmerHome.ok'), onPress: () => { } },
            { text: t('farmerHome.retry'), onPress: () => loadFarmerFruits() }
          ]
        );
        // Set empty arrays instead of sample data
        setActiveFruits([]);
        setFruitHistory([]);
      }
    } finally {
      if (isMounted) setLoadingFruits(false);
    }

    return () => {
      isMounted = false;
    };
  }, [userProfile?.uid]);

  // Refresh function for pull-to-refresh with cleanup
  const handleRefresh = useCallback(async () => {
    let isMounted = true;

    try {
      if (isMounted && userProfile?.uid) {
        // Use Promise.allSettled for concurrent loading but with proper error handling
        await Promise.allSettled([
          loadUserProfile(true),
          loadFarmerFruits()
        ]);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      if (isMounted) {
        Toast.show({
          type: 'error',
          text1: t('farmerHome.refreshFailedTitle'),
          text2: t('farmerHome.refreshFailedSubtitle'),
          position: 'bottom',
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [userProfile?.uid, loadFarmerFruits]);

  // Add loading indicator component
  const LoadingFruits = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <Icon name="leaf-outline" size={48} color={Colors.light.primary} />
        <Text style={styles.loadingText}>{t('farmerHome.loadingFruits')}</Text>
      </View>
    </View>
  );

  // Load fruits when user profile is loaded
  useEffect(() => {
    if (userProfile?.uid) {
      loadFarmerFruits();
    }
  }, [userProfile?.uid]);

  // (debug logs removed)

  // (debug logs removed)



  // Handle fruit status updates (mark as sold, inactive, etc.)
  const handleFruitStatusUpdate = useCallback(async (fruitId, newStatus) => {
    let isMounted = true;

    try {

      // Optimistic update
      if (newStatus === 'sold' || newStatus === 'inactive') {
        setActiveFruits(prev => prev.filter(fruit => fruit.id !== fruitId));
        const movedFruit = activeFruits.find(fruit => fruit.id === fruitId);
        if (movedFruit && isMounted) {
          setFruitHistory(prev => [{ ...movedFruit, status: newStatus }, ...prev]);
        }
      } else if (newStatus === 'active') {
        setFruitHistory(prev => prev.filter(fruit => fruit.id !== fruitId));
        const movedFruit = fruitHistory.find(fruit => fruit.id === fruitId);
        if (movedFruit && isMounted) {
          setActiveFruits(prev => [{ ...movedFruit, status: newStatus }, ...prev]);
        }
      }

      await updateFruitStatus(fruitId, newStatus);

      // Reload fruits to reflect changes from server
      if (isMounted) {
        await loadFarmerFruits();

        // Localized success toast
        const successMsg = newStatus === 'sold'
          ? t('farmerHome.toast.statusSold')
          : newStatus === 'inactive'
            ? t('farmerHome.toast.statusInactive')
            : newStatus === 'active'
              ? t('farmerHome.toast.statusActive')
              : t('farmerHome.toast.statusUpdated');

        Toast.show({
          type: 'success',
          text1: t('farmerHome.toast.successTitle', { defaultValue: t('common.success') }),
          text2: successMsg,
          position: 'bottom',
          visibilityTime: 1000,
        });
      }
    } catch (error) {
      console.error('❌ Error updating fruit status:', error);
      if (isMounted) {
        // Revert optimistic update
        await loadFarmerFruits();
        Alert.alert(
          t('farmerHome.toast.errorTitle', { defaultValue: t('common.error') }),
          t('farmerHome.toast.updateFailed', { message: error?.message || '' })
        );
      }
    }

    return () => {
      isMounted = false;
    };
  }, [activeFruits, fruitHistory, loadFarmerFruits]);

  // Handle marking a fruit as sold
  const markFruitAsSold = (fruit) => {
    Alert.alert(
      t('farmerHome.markAsSoldTitle'),
      t('farmerHome.markAsSoldMessage', { name: fruit.name }),
      [
        { text: t('farmerHome.cancel'), style: 'cancel' },
        {
          text: t('farmerHome.markAsSoldConfirm'),
          style: 'destructive',
          onPress: () => handleFruitStatusUpdate(fruit.id, 'sold')
        }
      ]
    );
  };

  // Handle reactivating a fruit
  const reactivateFruit = (fruit) => {
    Alert.alert(
      t('farmerHome.reactivateTitle'),
      t('farmerHome.reactivateMessage', { name: fruit.name }),
      [
        { text: t('farmerHome.cancel'), style: 'cancel' },
        {
          text: t('farmerHome.reactivateConfirm'),
          onPress: () => handleFruitStatusUpdate(fruit.id, 'active')
        }
      ]
    );
  };

  // Filter fruits based on search query and category - memoized
  const getFilteredFruits = useCallback((fruits) => {
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
        const location = `${fruit.location?.city || ''} ${fruit.location?.district || ''} ${fruit.location?.state || ''}`.toLowerCase();
        // const grade = (fruit.grade || '').toLowerCase();

        return (
          fruitName.includes(query) ||
          fruitType.includes(query) ||
          fruitDescription.includes(query) ||
          location.includes(query)
          // || grade.includes(query)
        );
      });
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  // Sort fruits based on selected sort option - memoized
  const getSortedFruits = useCallback((fruits) => {
    // Validate sortBy to prevent injection attacks
    const validSortKeys = sortOptions.map(option => option.key);
    if (!validSortKeys.includes(sortBy)) {
      console.warn('Invalid sort key detected:', sortBy);
      return fruits; // Return unsorted if invalid
    }

    const sortOption = sortOptions.find(option => option.key === sortBy);
    if (!sortOption || typeof sortOption.sortFn !== 'function') {
      console.warn('Invalid sort function for key:', sortBy);
      return fruits;
    }

    try {
      // Create a copy to avoid mutating original array
      const sortedFruits = [...fruits];
      return sortedFruits.sort(sortOption.sortFn);
    } catch (error) {
      console.error('Error sorting fruits:', error);
      return fruits; // Return original array if sorting fails
    }
  }, [sortBy]);

  // Handle sort selection with validation
  const handleSortSelection = useCallback((sortKey) => {
    // Validate sort key
    const isValidSortKey = sortOptions.some(option => option.key === sortKey);
    if (!isValidSortKey) {
      console.warn('Invalid sort key selected:', sortKey);
      return;
    }

    setSortBy(sortKey);
    setShowSortModal(false);

    // Show feedback to user
    // const selectedOption = sortOptions.find(option => option.key === sortKey);
    // if (selectedOption) {
    //   // We can use selectedOption.label for lable.
    // }
  }, []);

  // Memoized filtered and sorted results to prevent unnecessary recalculations
  const filteredActiveFruits = useMemo(() => {
    const filtered = getFilteredFruits(activeFruits);
    return getSortedFruits(filtered);
  }, [activeFruits, getFilteredFruits, getSortedFruits]);

  const filteredFruitHistory = useMemo(() => {
    const filtered = getFilteredFruits(fruitHistory);
    return getSortedFruits(filtered);
  }, [fruitHistory, getFilteredFruits, getSortedFruits]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle search input change - throttled to prevent excessive re-renders
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  // Helpers for localized labels
  const getCategoryLabel = useCallback((type) => {
    const item = fruitCategories.find(c => c.type === type);
    return item ? t(item.labelKey, { defaultValue: item.name }) : type;
  }, [t]);

  const getSortLabel = useCallback((key) => {
    const opt = sortOptions.find(o => o.key === key);
    return opt ? t(opt.labelKey || '', { defaultValue: opt.label }) : key;
  }, [t]);

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={styles.safeArea}>
        <StatusBar
          backgroundColor="#FFFFFF"
          barStyle="dark-content"
        />

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
          scrollEventThrottle={1} // Reduced for smoother animation
          bounces={true} // Enable bounce for better feel
          nestedScrollEnabled={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: false, // Height animations require layout thread
              listener: (event) => {
                const currentScrollY = event.nativeEvent.contentOffset.y;
                // Update fixed header visibility state - throttled to prevent excessive updates
                const shouldShowFixedHeader = currentScrollY > headerConstants.HEADER_SCROLL_DISTANCE * 0.7;

                // Only update state if it actually changed to prevent unnecessary re-renders
                setIsFixedHeaderVisible(prev => prev !== shouldShowFixedHeader ? shouldShowFixedHeader : prev);
              }
            }
          )}
          refreshControl={
            <RefreshControl
              refreshing={loadingFruits}
              onRefresh={handleRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
              title={t('farmerHome.refreshTitle')}
              titleColor={Colors.light.primary}
              progressBackgroundColor="#FFFFFF"
              progressViewOffset={120}
              progressViewTop={120}
              pullToRefreshThreshold={80}          // Distance to pull before refresh triggers
              refreshThreshold={100}               // Minimum pull distance for refresh
              distanceToRefresh={120}              // Distance to pull for visual feedback
            />
          }
        >
          {/* Collapsible Header */}
          <Animated.View style={[
            styles.header,
            {
              height: headerHeight,
              paddingTop: insets.top + 4,
            }
          ]}>
            <Animated.View style={[
              styles.headerContent,
              {
                opacity: headerOpacity,
                backgroundColor: 'transparent', // Prevent double background
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
                      style={styles.profilePlaceholderButton}
                      onPress={() => {
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
                    onPress={() => safeNavigate('ProfileScreen')}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 0, right: 10 }}
                  >
                    <Text style={styles.welcome}>
                      {t('farmerHome.greeting', { name: getDisplayName })}
                    </Text>
                    <TouchableOpacity activeOpacity={0.9} onPress={onLocationPress}>
                      <Animated.View style={[styles.locationContainer, styles.locationInteractive, locationAnimatedStyle]}>
                        <Text
                          style={styles.location}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {userProfile?.location ?
                            `${userProfile.location.city || ''}, ${userProfile.location.state || ''}`.replace(/, $/, '')
                            : t('farmerHome.setYourLocation')}
                        </Text>
                        <Icon name="chevron-down" size={12} color="#505050" />
                      </Animated.View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => safeNavigate('Notification')}
                  style={styles.notificationIconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="notifications-outline" size={24} color="#000" />
                  <NotificationBadge style={{margin:8}} size="small" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Icon name="search" size={20} color="#939393" style={{ marginLeft: 12 }} />
                  <TextInput
                    placeholder={t('farmerHome.searchPlaceholder')}
                    placeholderTextColor="#939393"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessible={true}
                    accessibilityLabel={t('farmerHome.searchInputLabel')}
                    accessibilityHint={t('farmerHome.searchInputHint')}
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

                <TouchableOpacity
                  style={[
                    styles.sortBtn,
                    // sortBy !== 'newest' && styles.sortBtnActive
                  ]}
                  onPress={() => setShowSortModal(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessible={true}
                  accessibilityLabel={t('farmerHome.sortButtonLabel')}
                  accessibilityHint={t('farmerHome.sortButtonHint')}
                >
                  <Icon name="swap-vertical-outline" size={20} color={Colors.light.primaryDark} />
                  {sortBy !== 'newest' && (
                    <View style={styles.sortActiveDot} />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Fruit Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('farmerHome.sectionCategories')}</Text>
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

                  {item.type === 'all' ? (
                    <Icon name="apps-outline" size={22} color={"#505050"} style={[styles.categoryIcon, {
                      marginHorizontal: 6,
                    }]} />
                  ) : (
                    <Image source={item.icon} style={styles.categoryImage} />
                  )}
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === item.type && styles.selectedCategoryText
                  ]}>{t(item.labelKey, { defaultValue: item.name })}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* My Listings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t('farmerHome.sectionMyListings')}</Text>
                {(searchQuery || selectedCategory !== 'all' || sortBy !== 'newest') && (
                  <Text
                    numberOfLines={2}
                    style={styles.searchResultsText}>
                    {searchQuery && `"${searchQuery.length > 10 ? searchQuery.slice(0, 10) + '...' : searchQuery}" • `}
                    {selectedCategory !== 'all' && `${getCategoryLabel(selectedCategory)} • `}
                    {sortBy !== 'newest' && `${getSortLabel(sortBy)} • `}
                    {(!showHistory
                      ? filteredActiveFruits.length
                      : filteredFruitHistory.length)} {t('farmerHome.resultsSuffix')}
                  </Text>
                )}
              </View>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, !showHistory && styles.activeTab]}
                  onPress={() => setShowHistory(false)}
                >
                  <Text style={[styles.tabText, !showHistory && styles.activeTabText]}>
                    {t('farmerHome.tabActive')} ({filteredActiveFruits.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, showHistory && styles.activeTab]}
                  onPress={() => setShowHistory(true)}
                >
                  <Text style={[styles.tabText, showHistory && styles.activeTabText]}>
                    {t('farmerHome.tabHistory')} ({filteredFruitHistory.length})
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
                    <Text style={styles.emptyStateText}>{t('farmerHome.emptyActiveTitle')}</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {t('farmerHome.emptyActiveSub1')}{"\n"}
                      {t('farmerHome.emptyActiveSub2')}
                    </Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={handleRefresh}
                    >
                      <Icon name="refresh-outline" size={20} color='#505050' />
                      <Text style={styles.refreshButtonText}>{t('farmerHome.refresh')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredActiveFruits.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="search-outline" size={64} color="#E0E0E0" />
                    <Text style={styles.emptyStateText}>{t('farmerHome.noResultsTitle')}</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {searchQuery ? t('farmerHome.noFruitsMatch', { query: searchQuery }) : t('farmerHome.noCategoryFruitsFound', { category: getCategoryLabel(selectedCategory) })}
                      {'\n'}{t('farmerHome.tryAdjusting')}
                    </Text>
                    {(searchQuery || selectedCategory !== 'all') && (
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSortBy('newest');
                        }}
                      >
                        <Icon name="refresh-outline" size={20} color='#505050' />
                        <Text style={styles.refreshButtonText}>{t('farmerHome.clearFilters')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <FlatList
                    nestedScrollEnabled={true}
                    key={selectedCategory} // Force re-render when category changes
                    data={filteredActiveFruits}
                    keyExtractor={(item) => item.id || item._id || `fruit_${Math.random()}`}
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
                              console.warn('Image load error for fruit:', item?.id, error);
                            }}
                          />
                          <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={styles.statusText}>{t('farmerHome.statusLive')}</Text>
                          </View>
                        </View>

                        <View style={styles.fruitDetails}>
                          <Text style={styles.fruitName} numberOfLines={1}>
                            {item.name || t('farmerHome.unnamedFruit')}
                          </Text>
                          <Text style={styles.dateText}>
                            {getRelativeTime(item.created_at || new Date().toISOString())}
                          </Text>

                          <View style={styles.priceRow}>
                            <Text style={styles.fruitPrice}>
                              {formatPrice(item.price_per_kg || 0)}
                            </Text>
                            {/* <Text style={styles.gradeText}>Grade {item.grade || 'A'}</Text> */}
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
                    <Text style={styles.emptyStateText}>{t('farmerHome.historyEmptyTitle')}</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {t('farmerHome.historyEmptySub1')}{"\n"}
                      {t('farmerHome.historyEmptySub2')}
                    </Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={handleRefresh}
                    >
                      <Icon name="refresh-outline" size={20} color='#505050' />
                      <Text style={styles.refreshButtonText}>{t('farmerHome.refresh')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredFruitHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="search-outline" size={64} color="#E0E0E0" />
                    <Text style={styles.emptyStateText}>{t('farmerHome.noResultsTitle')}</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {searchQuery ? t('farmerHome.noHistoryMatch', { query: searchQuery }) : t('farmerHome.noCategoryHistoryFound', { category: getCategoryLabel(selectedCategory) })}
                      {'\n'}{t('farmerHome.tryAdjusting')}
                    </Text>
                    {(searchQuery || selectedCategory !== 'all') && (
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSortBy('newest');
                        }}
                      >
                        <Icon name="refresh-outline" size={20} color='#505050' />
                        <Text style={styles.refreshButtonText}>{t('farmerHome.clearFilters')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <FlatList
                    nestedScrollEnabled={true}
                    data={filteredFruitHistory}
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
                            console.warn('History image load error for fruit:', item?.id, error);
                          }}
                        />
                        <View style={styles.historyDetails}>
                          <View style={styles.historyHeader}>
                            <Text style={styles.historyName} numberOfLines={1}>
                              {item.name || t('farmerHome.unnamedFruit')}
                            </Text>
                            <View style={[styles.historyStatusBadge,
                            item.status === 'sold' ? styles.soldOutBadge : styles.expiredBadge]}>
                              <Text style={[styles.historyStatusText,
                              item.status === 'sold' ? styles.soldOutText : styles.expiredText]}>
                                {item.status === 'sold' ? t('farmerHome.soldOut') : t('farmerHome.expired')}
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
                              <Text style={styles.historyStatText}>{item.views || 0} {t('farmerHome.viewsSuffix')}</Text>
                            </View>
                            <View style={styles.historyStat}>
                              <Icon name="heart-outline" size={12} color="#757575" />
                              <Text style={styles.historyStatText}>{item.likes || 0} {t('farmerHome.likesSuffix')}</Text>
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

        {/* Fixed Header Title - Shows on scroll */}
        <Animated.View
          style={[
            styles.fixedHeaderTitle,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              paddingTop: insets.top, // Adjusted padding
              height: headerConstants.HEADER_MIN_HEIGHT,
              backgroundColor: '#FFFFFF', // Ensure solid background
              // Animated shadow and elevation
              shadowOpacity: fixedHeaderShadowOpacity,
              elevation: fixedHeaderElevation, // For Android
            }
          ]}
          pointerEvents={isFixedHeaderVisible ? 'auto' : 'none'} // Only allow touch when sufficiently visible
        >
          <Image source={require('../../assets/icon.png')} style={styles.fixedHeaderImage} />
          <TouchableOpacity
            style={styles.notificationIconButton}
            onPress={() => safeNavigate('Notification')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="notifications-outline" size={24} color="#000" />
          </TouchableOpacity>

          {/* Animated Border */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#EFEFEF',
              opacity: fixedHeaderBorderOpacity,
            }}
          />
        </Animated.View>

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSortModal(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={styles.sortModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('farmerHome.sortModalTitle')}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowSortModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={20} color="#757575" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.sortOptionsContainer}
                showsVerticalScrollIndicator={false}
              >
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortOption,
                      sortBy === option.key && styles.selectedSort
                    ]}
                    onPress={() => handleSortSelection(option.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sortOptionContent}>
                      <Icon
                        name={option.icon}
                        size={18}
                        color={sortBy === option.key ? '#111111' : '#757575'}
                      />
                      <View style={styles.sortOptionText}>
                        <Text style={[
                          styles.sortOptionLabel,
                          sortBy === option.key && styles.selectedSortLabel
                        ]}>
                          {t(option.labelKey || '', { defaultValue: option.label })}
                        </Text>
                        <Text style={styles.sortOptionDescription}>
                          {t(option.descriptionKey || '', { defaultValue: option.description })}
                        </Text>
                      </View>
                    </View>
                    {sortBy === option.key && (
                      <Icon name="checkmark-circle" size={20} color='#111111' />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalResetButton}
                  onPress={() => {
                    setSortBy('newest');
                    setShowSortModal(false);
                  }}
                >
                  <Text style={styles.modalResetText}>{t('farmerHome.reset')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
        {/* Location Modal */}
        <Modal
          visible={isLocationModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsLocationModalVisible(false)}
          statusBarTranslucent={true}
          hardwareAccelerated={true}
        >
          <View style={[styles.locModalOverlay, { paddingBottom: insets.bottom }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsLocationModalVisible(false)} />
            <View style={styles.locModalContainer}>
              <View style={styles.locModalHeader}>
                <Text style={styles.locModalTitle}>{t('farmerHome.locationModalTitle')}</Text>
                <TouchableOpacity onPress={() => setIsLocationModalVisible(false)} style={styles.locCloseBtn}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.locPrivacyRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="lock-closed-outline" size={16} color="#10B981" />
                  <Text style={styles.locPrivacyLabel}>{t('farmerHome.locationPrivate')}</Text>
                </View>
                <Text style={styles.locSetLabel}>{t('farmerHome.setLocation')}</Text>
              </View>

              <View style={styles.locPreviewCard}>
                {userProfile?.location ? (
                  <>
                    <Text style={styles.locPreviewMain} numberOfLines={2}>
                      {/* TODO: location may now be string | object; safeguard casting */}
                      {(() => {
                        const loc = userProfile.location || {};
                        if (typeof loc === 'string') return loc || '—';
                        const city = loc.city || ''; const state = loc.state || '';
                        return `${city}${city && state ? ', ' : ''}${state}`.replace(/, $/, '') || '—';
                      })()}
                    </Text>
                    {!!(typeof userProfile.location === 'object' && userProfile.location?.formattedAddress) && (
                      <Text style={styles.locPreviewSub} numberOfLines={2}>
                        {userProfile.location.formattedAddress}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.locPreviewPlaceholder}>{t('farmerHome.noLocation')}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.locActionBtn, isGettingLocation && { opacity: 0.7 }]}
                activeOpacity={0.8}
                disabled={isGettingLocation}
                onPress={async () => {
                  if (!userProfile?.uid || !userProfile?.userRole) return;
                  try {
                    setIsGettingLocation(true);
                    // Detect current location (prefer cache speed)
                    let locData = null;
                    const cached = await getLocationWithCache();
                    if (cached?.locationData) {
                      locData = {
                        ...cached.locationData,
                        latitude: cached.location?.latitude,
                        longitude: cached.location?.longitude,
                      };
                    } else {
                      const gps = await getCurrentLocation();
                      const address = await getFastLocation(gps.latitude, gps.longitude);
                      locData = { ...address, latitude: gps.latitude, longitude: gps.longitude };
                    }

                    const ok = await updateUserLocation(userProfile.uid, userProfile.userRole, locData);
                    if (ok) {
                      setUserProfile(prev => prev ? { ...prev, location: locData } : prev);
                      Toast.show({ type: 'success', text1: t('farmerHome.locationUpdated'), position: 'bottom' });
                      setIsLocationModalVisible(false);
                    } else {
                      Toast.show({ type: 'error', text1: t('farmerHome.updateFailedTitle'), text2: t('farmerHome.updateFailedSubtitle') });
                    }
                  } catch (e) {
                    console.error('Location update failed:', e?.message || e);
                    Toast.show({ type: 'error', text1: t('farmerHome.locationFailedTitle'), text2: e?.userMessage || t('farmerHome.locationFailedSubtitle') });
                  } finally {
                    setIsGettingLocation(false);
                  }
                }}
              >
                {isGettingLocation ? (
                  <Text style={styles.locActionBtnText}>{t('farmerHome.updating')}</Text>
                ) : (
                  <Text style={styles.locActionBtnText}>{t('farmerHome.updateLocation')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Match BuyerHomeScreen lighter app background
    backgroundColor: '#F8FAFC',
  },
  scrollViewContent: {
    paddingBottom: 90,
    // Ensure background carries through behind transparent header
    backgroundColor: '#F8FAFC',
  },
  header: {
    // Align with BuyerHomeScreen collapsing header styling (minimal + transparent)
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
    overflow: 'visible',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixedHeaderTitle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', // Keep solid for readability when collapsed
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000, // High z-index to stay on top
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0, // Animated via interpolation (kept consistent with Buyer)
    shadowRadius: 4,
    elevation: 0, // Animated value will raise on scroll
    opacity: 1,
  },
  fixedHeaderImage: {
    width: 150,
    height: 54,
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
    width: 54,
    height: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
    marginLeft: 6,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInteractive: {
    borderRadius: 8,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 6,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    maxWidth: 170,
    flexShrink: 1,
  },
  notificationIconButton: {
    padding: 5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    height: 52,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
    shadowRadius: 4,
    elevation: 2,
  },
  sortBtn: {
    backgroundColor: '#E8F5E8',
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    position: 'relative',
  },
  // sortBtnActive: {
  //   backgroundColor: Colors.light.primary,
  //   borderColor: Colors.light.primaryDark,
  //   shadowOpacity: 0.25,
  // },
  sortActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
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
    maxWidth: 145,
    overflow: 'hidden',
    display: 'flex',
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
    fontWeight: '700',
    color: "#111111",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#93939315',
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
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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

  // Sort Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sortModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  sortOptionsContainer: {
    maxHeight: screenHeight * 0.5,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  selectedSort: {
    backgroundColor: Colors.light.primaryLight,
    borderBottomColor: Colors.light.primary,
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sortOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  sortOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  selectedSortLabel: {
    fontWeight: '700',
  },
  sortOptionDescription: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 18,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  modalResetButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalResetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },

  // Location Modal Styles
  locModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  locModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  locModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  locCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locPrivacyRow: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locPrivacyLabel: {
    marginLeft: 6,
    color: '#10B981',
    fontWeight: '700',
  },
  locSetLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  locPreviewCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  locPreviewMain: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  locPreviewSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  locPreviewPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  locActionBtn: {
    marginTop: 14,
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  locActionBtnText: {
    color: Colors.light.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
});

export default FarmerHomeScreen;