// HomeScreen.js

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
  Modal,
  SafeAreaView,
  Pressable,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getCompleteUserProfile, updateLastLogin, validateCurrentUser, updateUserLocation, isNetworkAvailable } from '../../services/firebaseService';
import { getFilteredMarketplaceFruits } from '../../services/fruitService';
import { auth } from '../../config/firebaseModular';
import { Colors } from '../../constants';
import { getHeaderConstants } from '../../constants/Layout';
import FilterScreen from './FilterScreen';
import Toast from 'react-native-toast-message';
import ErrorBoundary from '../common/ErrorBoundary';
import { FruitCard } from '../../ui';
import {
  formatPrice,
  formatFruitQuantity,
  formatLocation,
  getRelativeTime,
  getDaysSince
} from '../../utils/formatters';
import { getLocationWithCache, getCurrentLocation, getFastLocation } from '../../utils/permissions';
import { initializeLocationCache } from '../../utils/locationCache';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useTranslation } from 'react-i18next';

const categories = [
  { type: 'all', icon: null, labelKey: 'labels.all' },
  { type: 'banana', icon: require('../../assets/fruits/banana.png'), labelKey: 'fruits.banana' },
  { type: 'orange', icon: require('../../assets/fruits/orange.png'), labelKey: 'fruits.orange' },
  { type: 'grape', icon: require('../../assets/fruits/grapes.png'), labelKey: 'fruits.grape' },
  { type: 'pomegranate', icon: require('../../assets/fruits/pomegranate.png'), labelKey: 'fruits.pomegranate' },
  { type: 'sweet lemon', icon: require('../../assets/fruits/sweetlemon.png'), labelKey: 'fruits.sweetLemon' },
  { type: 'apple', icon: require('../../assets/fruits/Apple.png'), labelKey: 'fruits.apple' },
  { type: 'mango', icon: require('../../assets/fruits/mango.png'), labelKey: 'fruits.mango' },
];

const BuyerHomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerConstants = getHeaderConstants(insets.top);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [allFruits, setAllFruits] = useState([]); // Store all fruits for filtering
  const [loadingFruits, setLoadingFruits] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isFixedHeaderVisible, setIsFixedHeaderVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    selectedFeatures: [],
    priceRange: null,
    minPrice: 0,
    maxPrice: 500,
    minRating: 0,
    // New filters
    freshProduceWindow: null, // 'today' | '2days' | 'week' | 'month'
    sortNewestFirst: false,
    locationLevel: null, // 'city' | 'district' | 'state'
  });
  const scrollY = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const searchTimeoutRef = useRef(null);
  // Guard counters to prevent premature logout when Firebase user temporarily null (offline/race)
  const userValidationAttempts = useRef(0);
  const validatingUserRef = useRef(false);
  // Location modal state
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  // Location tap animation
  const locationTapAnim = useRef(new Animated.Value(0)).current;
  // Filter modal drag animation
  const filterModalTranslateY = useRef(new Animated.Value(0)).current;

  const onLocationPress = useCallback(() => {
    locationTapAnim.setValue(0);
    Animated.sequence([
      Animated.timing(locationTapAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(locationTapAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    // Open modal slightly after the pulse begins for immediate feedback
    setTimeout(() => setIsLocationModalVisible(true), 90);
  }, [locationTapAnim]);

  const locationAnimatedStyle = useMemo(() => ({
    transform: [{
      scale: locationTapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] })
    }],
    opacity: locationTapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] })
  }), [locationTapAnim]);

  // PanResponder for Filter Modal drag-to-dismiss
  const filterModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate pan responder if dragging down
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        filterModalTranslateY.setOffset(filterModalTranslateY._value);
        filterModalTranslateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down, not up
        if (gestureState.dy > 0) {
          filterModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        filterModalTranslateY.flattenOffset();

        // If dragged down more than 150px or with high velocity, dismiss
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          Animated.timing(filterModalTranslateY, {
            toValue: 600,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setIsFilterModalVisible(false);
            filterModalTranslateY.setValue(0);
            slideAnim.setValue(0);
          });
        } else {
          // Spring back to original position
          Animated.spring(filterModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Memoized formatter functions to prevent recreation
  const memoizedFormatPrice = useCallback(formatPrice, []);
  const memoizedFormatFruitQuantity = useCallback(formatFruitQuantity, []);
  const memoizedFormatLocation = useCallback(formatLocation, []);

  // Memoized filtered categories based on user preferences
  const filteredCategories = useMemo(() => {
    if (!userProfile?.PreferedFruits || !Array.isArray(userProfile.PreferedFruits) || userProfile.PreferedFruits.length === 0) {
      return categories; // Show all categories if no preferences set
    }

    // Always include 'All' category
    const userCategories = [categories[0]]; // 'All' category

    // Add only preferred fruit categories
    const preferredCategoriesLower = userProfile.PreferedFruits.map(fruit => fruit.toLowerCase());
    categories.slice(1).forEach(category => {
      if (preferredCategoriesLower.includes(category.type.toLowerCase())) {
        userCategories.push(category);
      }
    });

    return userCategories;
  }, [userProfile?.PreferedFruits]);

  // Calculate header height and opacity based on scroll with proper constants
  const headerHeight = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [headerConstants.HEADER_MAX_HEIGHT, headerConstants.HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.5, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [15, 0],
    extrapolate: 'clamp',
  });

  // Fixed header shadow opacity - matches title opacity
  const fixedHeaderShadowOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.7, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 0.1],
    extrapolate: 'clamp',
  });

  // Fixed header border opacity - only show when nearly fully visible
  const fixedHeaderBorderOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.85, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Fixed header elevation for Android
  const fixedHeaderElevation = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.8, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1, 8],
    extrapolate: 'clamp',
  });

  // Search row animation - smoother transition
  const searchRowOpacity = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE * 0.4, headerConstants.HEADER_SCROLL_DISTANCE * 0.9],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const searchRowTranslateY = scrollY.interpolate({
    inputRange: [0, headerConstants.HEADER_SCROLL_DISTANCE],
    outputRange: [0, -25],
    extrapolate: 'clamp',
  });


  // Always fetch fresh profile on mount with cleanup
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

  // Always fetch fresh profile on screen focus with cleanup
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const handleFocus = async () => {
        if (isMounted && userProfile?.uid) {
          await loadUserProfile(true);
        }
      };

      handleFocus();

      return () => {
        isMounted = false;
      };
    }, [userProfile?.uid])
  );


  React.useEffect(() => {
    changeNavigationBarColor('#ffffff', true);
    // 1st arg = color
    // 2nd arg = light/dark icons (true = light icons, false = dark icons)
  }, []);

  // Initialize background location cache on mount
  useEffect(() => {
    initializeLocationCache();
  }, []);


  // Filter modal functions - optimized with useCallback
  const openFilterModal = useCallback(() => {
    setIsFilterModalVisible(true);
    slideAnim.setValue(0);
    filterModalTranslateY.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, filterModalTranslateY]);

  const closeFilterModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(filterModalTranslateY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsFilterModalVisible(false);
      filterModalTranslateY.setValue(0);
    });
  }, [slideAnim, filterModalTranslateY]);

  // Get display name for greeting - memoized to prevent recalculations
  const getDisplayName = useMemo(() => {
    let name;
    if (userProfile?.firstName) {
      name = userProfile.firstName;
    } else if (userProfile?.displayName) {
      name = userProfile.displayName.split(' ')[0];
    } else {
      name = 'there';
    }

    // Allow names up to 11 characters, truncate with "..." if longer
    // When truncating, show only 11 characters + "..."
    // Font size will be reduced for longer names (handled in getDynamicFontSize)
    if (name.length > 11) {
      return name.substring(0, 11) + '...';
    }
    return name;
  }, [userProfile?.firstName, userProfile?.displayName]);

  const getDynamicFontSize = useMemo(() => {
    const nameLength = getDisplayName.length;

    // Base font size is 22, minimum is 18
    // More granular font size reduction based on character count
    const baseFontSize = 22;
    const minFontSize = 18;

    if (nameLength <= 6) {
      // Very short names: use full font size
      return baseFontSize;
    } else if (nameLength <= 8) {
      // Short names: slight reduction
      return 21;
    } else if (nameLength <= 10) {
      // Medium names: more reduction
      return 20;
    } else if (nameLength <= 11) {
      // Long names: further reduction
      return 19;
    } else {
      // Very long names (truncated): use minimum
      return minFontSize;
    }
  }, [getDisplayName]);

  // Optimized handleApplyFilters with memoization
  const handleApplyFilters = useCallback((filters) => {
    // Store applied filters for state management
    setAppliedFilters(filters);

    let filtered = [...allFruits];

    // Filter by user's preferred fruits first if available
    if (userProfile?.PreferedFruits && Array.isArray(userProfile.PreferedFruits) && userProfile.PreferedFruits.length > 0) {
      filtered = filtered.filter(fruit => {
        const fruitType = fruit.type?.toLowerCase();
        return userProfile.PreferedFruits.some(preferredFruit =>
          preferredFruit.toLowerCase() === fruitType
        );
      });
    }

    // Apply price range filter
    if (filters.minPrice > 0 || filters.maxPrice < 500) {
      filtered = filtered.filter(fruit => {
        const price = parseFloat(fruit.price_per_kg || 0);
        return price >= filters.minPrice && price <= filters.maxPrice;
      });
    }

    // Apply Fresh Produce by availability_date presets
    if (filters.freshProduceWindow) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const withinDays = (d1, days) => (startOfToday - d1) <= days * 24 * 60 * 60 * 1000 && d1 <= startOfToday;

      filtered = filtered.filter(fruit => {
        if (!fruit.availability_date) return false; // must have availability_date
        const d = new Date(fruit.availability_date);
        if (Number.isNaN(d.getTime())) return false;
        switch (filters.freshProduceWindow) {
          case 'today':
            return d.toDateString() === startOfToday.toDateString();
          case '2days':
            return withinDays(d, 2);
          case 'week':
            return withinDays(d, 7);
          case 'month':
            return withinDays(d, 30);
          default:
            return true;
        }
      });
    }

    // Apply features filter
    if (filters.selectedFeatures && filters.selectedFeatures.length > 0) {
      filters.selectedFeatures.forEach(feature => {
        switch (feature) {
          // Disabled for now: keep for future re-enable
          // case 'Top Rated':
          //   filtered = filtered.filter(fruit => {
          //     const rating = parseFloat(fruit.avg_rating || fruit.rating || 0);
          //     return rating >= 4;
          //   });
          //   break;
          case 'Fresh Stock': {
            // Use created_at if available; fallback to dateCreated
            filtered = filtered.filter(fruit => {
              const createdTs = fruit.created_at || fruit.dateCreated;
              if (!createdTs) return true; // keep if unknown
              const daysAgo = getDaysSince(createdTs);
              return daysAgo <= 3;
            });
            break;
          }
          // Disabled for now: keep for future re-enable
          // case 'In Season':
          //   filtered = filtered.filter(fruit => {
          //     const currentMonth = new Date().getMonth() + 1;
          //     const fruitType = fruit.type?.toLowerCase();
          //     if (fruitType === 'mango') return currentMonth >= 3 && currentMonth <= 6;
          //     if (fruitType === 'apple') return currentMonth >= 9 && currentMonth <= 2;
          //     if (fruitType === 'orange') return currentMonth >= 11 || currentMonth <= 3;
          //     return true;
          //   });
          //   break;
          // case 'Off Season':
          //   filtered = filtered.filter(fruit => {
          //     const currentMonth = new Date().getMonth() + 1;
          //     const fruitType = fruit.type?.toLowerCase();
          //     if (fruitType === 'mango') return !(currentMonth >= 3 && currentMonth <= 6);
          //     if (fruitType === 'apple') return !(currentMonth >= 9 && currentMonth <= 2);
          //     if (fruitType === 'orange') return !(currentMonth >= 11 || currentMonth <= 3);
          //     return true;
          //   });
          //   break;
          // New simple, safe features we can support now:
          case 'With Images': {
            filtered = filtered.filter(fruit => Array.isArray(fruit.image_urls) && fruit.image_urls.length > 0);
            break;
          }
          case 'Available Now': {
            filtered = filtered.filter(fruit => {
              const isActive = (fruit.status || 'active').toLowerCase() === 'active';
              if (!isActive) return false;
              if (!fruit.availability_date) return true;
              const availableFrom = new Date(fruit.availability_date).getTime();
              return !Number.isNaN(availableFrom) ? availableFrom <= Date.now() : true;
            });
            break;
          }
          default:
            break;
        }
      });
    }

    // Rating filter disabled for now. To re-enable, filter by
    // parseFloat(fruit.avg_rating || fruit.rating || 0) >= filters.minRating

    // Apply location filter relative to current buyer location
    if (filters.locationLevel && userProfile?.location) {
      const buyerLoc = userProfile.location || {};
      const norm = (v) => (v || '').toString().trim().toLowerCase();
      const buyerCity = norm(buyerLoc.city || buyerLoc.village);
      const buyerDistrict = norm(buyerLoc.district);
      const buyerState = norm(buyerLoc.state);

      filtered = filtered.filter(fruit => {
        const loc = fruit.location || {};
        const fruitCity = norm(loc.city || loc.village);
        const fruitDistrict = norm(loc.district);
        const fruitState = norm(loc.state);
        switch (filters.locationLevel) {
          case 'city':
            return buyerCity && fruitCity ? fruitCity === buyerCity : true;
          case 'district':
            return buyerDistrict && fruitDistrict ? fruitDistrict === buyerDistrict : true;
          case 'state':
            return buyerState && fruitState ? fruitState === buyerState : true;
          default:
            return true;
        }
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

    // Sort - Newest First by updated_at (fallback created_at)
    if (filters.sortNewestFirst) {
      filtered = filtered.sort((a, b) => {
        const ad = new Date(a.updated_at || a.created_at || 0).getTime();
        const bd = new Date(b.updated_at || b.created_at || 0).getTime();
        return bd - ad;
      });
    }

    setFruits(filtered);
    closeFilterModal();
  }, [allFruits, selectedCategory, searchQuery, closeFilterModal, userProfile?.PreferedFruits]);
  // Safe navigation function to prevent "route not defined" errors
  const safeNavigate = (routeName, params = {}) => {
    try {
      navigation.navigate(routeName, params);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        t('alerts.navigationErrorTitle', 'Navigation Error'),
        t('alerts.navigationErrorMessage', { route: routeName, defaultValue: `Cannot navigate to ${routeName}. This screen may not be available.` })
      );
    }
  };

  const loadUserProfile = async (forceRefresh = false) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        const online = await isNetworkAvailable().catch(() => false);
        userValidationAttempts.current += 1;
        // user temporarily null; handled with retries
        if (!online && userValidationAttempts.current <= 5) {
          // Offline scenario – keep session, retry a few times
          setTimeout(() => loadUserProfile(forceRefresh), 600);
          return;
        }
        if (userValidationAttempts.current <= 3) {
          // Possible race; retry before declaring failure
          setTimeout(() => loadUserProfile(forceRefresh), 400 * userValidationAttempts.current);
          return;
        }
        handleUserValidationFailure();
        return;
      }

      // First validate if the user still exists on Firebase server
      if (!validatingUserRef.current) {
        validatingUserRef.current = true;
        const isValidUser = await validateCurrentUser();
        validatingUserRef.current = false;
        if (!isValidUser) {
          const online = await isNetworkAvailable().catch(() => false);
          if (online) {
            handleUserValidationFailure();
            return;
          } else {
            // offline validation failed; preserving session until back online
          }
        }
      }

      // Get complete user profile from Firestore/AsyncStorage, force refresh if needed
      const profile = await getCompleteUserProfile(forceRefresh);

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
    // Fixed navigation - using proper reset navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
    // user deleted from DB or logged out

  };

  // Memoized renderStars to prevent recalculations
  const renderStars = useCallback((rating) => {
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
  }, []);

  // Load marketplace fruits from Firebase with cleanup
  const loadMarketplaceFruits = useCallback(async () => {
    let isMounted = true;

    try {
      if (isMounted) setLoadingFruits(true);

      // Build DB-side filters
      const norm = (v) => (v || '').toString().trim().toLowerCase();
      const prefs = Array.isArray(userProfile?.PreferedFruits) ? userProfile.PreferedFruits.map(norm).filter(Boolean) : [];

      // If a category is selected, prefer that; otherwise, use preferences (if any)
      const dbFilters = selectedCategory && selectedCategory !== 'all'
        ? { type: norm(selectedCategory), limit: 100 }
        : (prefs.length > 0 ? { types: prefs, limit: 100 } : { limit: 100 });

      const marketplaceFruits = await getFilteredMarketplaceFruits(dbFilters);

      if (isMounted) {
        let filtered = marketplaceFruits || [];

        // Safety: if preferences exist but we didn't send them (edge), enforce on client
        if (!dbFilters.type && !dbFilters.types && prefs.length > 0) {
          filtered = filtered.filter((f) => prefs.includes(norm(f.type)));
        }

        // Apply client search only (DB text search not implemented)
        if (searchQuery && searchQuery.trim()) {
          const s = searchQuery.toLowerCase().trim();
          filtered = filtered.filter((fruit) => {
            const matchName = fruit.name?.toLowerCase().includes(s);
            const matchType = fruit.type?.toLowerCase().includes(s);
            const matchDescription = fruit.description?.toLowerCase().includes(s);
            const matchCity = fruit.location?.city?.toLowerCase().includes(s);
            const matchDistrict = fruit.location?.district?.toLowerCase().includes(s);
            const matchState = fruit.location?.state?.toLowerCase().includes(s);
            return matchName || matchType || matchDescription || matchCity || matchDistrict || matchState;
          });
        }

        // Store in allFruits as current working set (already filtered from DB)
        setAllFruits(filtered);
        setFruits(filtered);
      }
    } catch (error) {
      console.error('❌ Error loading marketplace fruits:', error);

      if (isMounted) {
        setAllFruits([]);
        setFruits([]);

        Toast.show({
          type: 'error',
          text1: 'Data Load Failed',
          text2: 'Unable to load fruits. Check connection.',
          position: 'bottom',
          visibilityTime: 1000,
        });
      }
    } finally {
      if (isMounted) setLoadingFruits(false);
    }

    return () => {
      isMounted = false;
    };
  }, [userProfile?.PreferedFruits, selectedCategory, searchQuery]);

  // Handle category change - optimized with useCallback
  const handleCategoryChange = useCallback((categoryType) => {
    setSelectedCategory(categoryType);
  }, []);

  // Handle search query change with debouncing - optimized
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the filtering to improve performance
    searchTimeoutRef.current = setTimeout(() => {
      loadMarketplaceFruits();
    }, 300);
  }, [loadMarketplaceFruits]);

  // Handle refresh - optimized with useCallback
  const handleRefresh = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    clearAllFilters();
  }, [clearAllFilters]);

  // Handle pull to refresh with cleanup
  const onRefresh = useCallback(async () => {
    let isMounted = true;
    try {
      if (isMounted) setRefreshing(true);
      await Promise.allSettled([
        handleRefresh(),
        loadUserProfile(true),
        loadMarketplaceFruits()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
      if (isMounted) {
        Toast.show({
          type: 'error',
          text1: 'Refresh Failed',
          text2: 'Please try again later',
          position: 'bottom',
        });
      }
    } finally {
      if (isMounted) setRefreshing(false);
    }

    return () => {
      isMounted = false;
    };
  }, [loadMarketplaceFruits]);

  // Clear all filters - optimized with useCallback
  const clearAllFilters = useCallback(() => {
    console.log('🧹 BuyerHomeScreen clearing all filters');

    setSearchQuery('');
    setSelectedCategory('all');

    const defaultFilters = {
      selectedFeatures: [],
      priceRange: null,
      minPrice: 0,
      maxPrice: 500,
      minRating: 0,
      freshProduceWindow: null,
      sortNewestFirst: false,
      locationLevel: null,
    };

    setAppliedFilters(defaultFilters);

    // Fresh DB query without filters
    loadMarketplaceFruits();

    console.log('✅ All filters cleared');
  }, [loadMarketplaceFruits]);

  // Load fruits when component mounts - only once
  useEffect(() => {
    loadMarketplaceFruits();

    // Cleanup search timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [loadMarketplaceFruits]);

  // Reload fruits when user profile changes (especially preferred fruits)
  useEffect(() => {
    if (userProfile) {
      loadMarketplaceFruits();
    }
  }, [userProfile?.PreferedFruits]);

  // Remove duplicate focus effect for fruits loading
  // Fruits will be loaded once on mount and refreshed via pull-to-refresh

  // Memoized product navigation handler to prevent object recreation
  const handleProductPress = useCallback((item) => {
    const productData = {
      // Core fruit properties from fruit.ts schema
      id: item.id,
      name: item.name,
      type: item.type,
      // grade: item.grade, // disabled: grade not used currently
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
      rating: 4.8,
      reviewCount: Math.floor((item.likes || 0) * 2),
      freshness: t('labels.new', 'Fresh'),
      details: `${item.name} ${t('buyerHome.fromLocation', 'from')} ${formatLocation(item.location)}. ${t('buyerHome.availableQuantity', 'Available quantity')}: ${formatFruitQuantity(item.quantity)}`,
      image: { uri: item.image_urls?.[0] || 'https://via.placeholder.com/150' },
      postedDate: getRelativeTime(item.created_at),
      listedDate: getDaysSince(item.created_at)
    };

    safeNavigate('ProductDetail', { product: productData });
  }, []);

  // Memoized list rendering
  const renderFruitItem = useCallback(({ item }) => (
    <FruitCard
      item={item}
      onPress={handleProductPress}
      formatPrice={memoizedFormatPrice}
      formatFruitQuantity={memoizedFormatFruitQuantity}
      formatLocation={memoizedFormatLocation}
    />
  ), [handleProductPress, memoizedFormatPrice, memoizedFormatFruitQuantity, memoizedFormatLocation]);
  const keyExtractor = useCallback((item) => item.id, []);

  // Debounce category change to reduce reloads
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadMarketplaceFruits();
    }, 150);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [selectedCategory]);

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={styles.safeArea}>

        <StatusBar
          backgroundColor="#FFFFFF"
          barStyle="dark-content"
        />

        {/* Fixed Header Title - Shows on scroll */}
        <Animated.View
          style={[
            styles.fixedHeaderTitle,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              paddingTop: insets.top + 4,
              height: headerConstants.HEADER_MIN_HEIGHT,
              backgroundColor: '#FFFFFF',
              shadowOpacity: fixedHeaderShadowOpacity,
              elevation: fixedHeaderElevation,
            }
          ]}
          pointerEvents={isFixedHeaderVisible ? 'auto' : 'none'} // Only allow touch when sufficiently visible
        >
          <Image source={require('../../assets/icon.png')} style={styles.fixedHeaderImage} />
          <TouchableOpacity
            style={[styles.notificationIconButton, { marginLeft: 10 }]}
            onPress={() => {
              navigation.navigate('Notification');
            }}
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

        <Animated.FlatList
          data={fruits}
          keyExtractor={keyExtractor}
          renderItem={renderFruitItem}
          initialNumToRender={8}
          windowSize={10}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentInset={{ top: 20 }}
          contentOffset={{ x: 0, y: -20 }}
          contentContainerStyle={styles.scrollViewContent}
          scrollEventThrottle={16}
          bounces={true}
          overScrollMode="auto"
          refreshing={refreshing}
          onRefresh={onRefresh}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: false,
              listener: (event) => {
                const currentScrollY = event.nativeEvent.contentOffset.y;
                const shouldShowFixedHeader = currentScrollY > headerConstants.HEADER_SCROLL_DISTANCE * 0.7;
                setIsFixedHeaderVisible(prev => prev !== shouldShowFixedHeader ? shouldShowFixedHeader : prev);
              }
            }
          )}
          ListHeaderComponent={(
            <>
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
                    backgroundColor: 'transparent',
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
                        onPress={() => {
                          safeNavigate('ProfileScreen');
                        }}
                        activeOpacity={0.8}
                        hitSlop={{ top: 10, bottom: 10, left: 0, right: 10 }}
                      >
                        <Text style={[styles.welcome, { fontSize: getDynamicFontSize }]}>
                          {t('buyerHome.greeting', { name: getDisplayName, defaultValue: `Namaste, ${getDisplayName}!` })}
                        </Text>
                        <TouchableOpacity activeOpacity={0.9} onPress={onLocationPress}>
                          <Animated.View style={[styles.locationContainer, styles.locationInteractive, locationAnimatedStyle]}>
                            <Text
                              style={styles.location}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {userProfile?.location
                                ? [userProfile.location.city, userProfile.location.district]
                                  .filter(part => !!part && part.trim().length > 0)
                                  .join(', ') || t('buyerHome.setYourLocation', 'Set your Location')
                                : t('buyerHome.setYourLocation', 'Set your Location')}
                            </Text>
                            <Icon name="chevron-down" size={12} color="#505050" />
                          </Animated.View>
                        </TouchableOpacity>
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

                  {/* Search Row with Animation */}
                  <Animated.View style={[
                    styles.searchRow,
                    {
                      transform: [{ translateY: searchRowTranslateY }]
                    }
                  ]}>
                    <View style={styles.searchBox}>
                      {/* Fade only the content, not the elevated surface */}
                      <Animated.View style={{ opacity: searchRowOpacity, flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Icon name="search" size={20} color="#939393" style={{ marginLeft: 12 }} />
                        <TextInput
                          placeholder="Search fruits..."
                          placeholderTextColor="#939393"
                          style={styles.searchInput}
                          value={searchQuery}
                          onChangeText={handleSearchChange}
                          accessible={true}
                          accessibilityLabel="Search input"
                          accessibilityHint="Enter keywords to search for fruits"
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => handleSearchChange('')}
                            style={{ paddingRight: 12 }}
                          >
                            <Icon name="close-circle" size={20} color="#939393" />
                          </TouchableOpacity>
                        )}
                      </Animated.View>
                    </View>

                    {/* Filter Model */}
                    <TouchableOpacity style={styles.filterBtn} onPress={() => {
                      openFilterModal();
                    }}>
                      {/* Fade only the icon */}
                      <Animated.View style={{ opacity: searchRowOpacity }}>
                        <Icon name="options-outline" size={20} color={Colors.light.primaryDark} />
                      </Animated.View>
                    </TouchableOpacity>
                  </Animated.View>
                </Animated.View>
              </Animated.View>

              {/* Categories */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('buyerHome.sectionCategories', 'Categories')}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      // Navigate directly within Buyer stack to avoid Auth redirecting back to Main
                      safeNavigate('FruitsScreen', { onboarding: false, fromAuth: false, mode: 'edit' })
                    }
                  >
                    <Text style={styles.editPreferences}>
                      {userProfile?.PreferedFruits && userProfile.PreferedFruits.length > 0 ? t('buyerHome.edit', 'Edit') : t('buyerHome.setPreferences', 'Set Preferences')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  {filteredCategories.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.categoryCard,
                        selectedCategory === item.type && styles.selectedCategoryCard
                      ]}
                      onPress={() => handleCategoryChange(item.type)}
                    >
                      {item.type === 'all' ? (
                        <Icon name="apps-outline" size={22} color={"#505050"} style={[styles.categoryIcon, {
                          marginHorizontal: 6,
                        }]} />
                      ) : (
                        <Image source={item.icon} style={styles.categoryImage} />
                      )}
                      <Text style={[
                        styles.categoryText, {
                          marginHorizontal: item.type === 'all' ? 4 : 0
                        },
                        selectedCategory === item.type && styles.selectedCategoryText
                      ]}>{t(item.labelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Available Fruits */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('buyerHome.sectionAvailable', 'Available Fruits')}</Text>
                </View>
              </View>
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.section}>
              <View style={styles.fruitsContainer}>
                {loadingFruits ? (
                  <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIcon}>
                      <Icon name="refresh-outline" size={48} color="#CCCCCC" />
                    </View>
                    <Text style={styles.emptyStateTitle}>{t('buyerHome.loadingTitle', 'Loading Fruits...')}</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {t('buyerHome.loadingSubtitle', 'Please wait while we fetch fresh fruits from farmers')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIcon}>
                      <Icon name="basket-outline" size={48} color="#CCCCCC" />
                    </View>
                    <Text style={styles.emptyStateTitle}>
                      {searchQuery || selectedCategory !== 'all' ? t('buyerHome.emptyTitleNoMatch', 'No Matching Fruits') :
                        userProfile?.PreferedFruits && userProfile.PreferedFruits.length > 0 ?
                          t('buyerHome.emptyTitleNoPreferred', 'No Preferred Fruits Available') : t('buyerHome.emptyTitleNoFruits', 'No Fruits Available')}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery || selectedCategory !== 'all'
                        ? t('buyerHome.emptySubNoMatch', 'Try adjusting your search or category filter')
                        : userProfile?.PreferedFruits && userProfile.PreferedFruits.length > 0 ?
                          t('buyerHome.emptySubNoPreferred', 'No fruits matching your preferences are currently available.') :
                          t('buyerHome.emptySubNoFruits', 'Fresh fruits will be listed here when farmers post them')}
                    </Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={handleRefresh}
                    >
                      <Icon name="refresh-outline" size={18} color={Colors.light.primary} />
                      <Text style={styles.refreshButtonText}>
                        {searchQuery || selectedCategory !== 'all' ? t('farmerHome.clearFilters', 'Clear Filters') : t('farmerHome.refresh', 'Refresh')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        />

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
                      translateY: Animated.add(
                        slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [600, 0],
                          extrapolate: 'clamp',
                        }),
                        filterModalTranslateY
                      ),
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.modalHeader}
                {...filterModalPanResponder.panHandlers}
              >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderContent}>
                  <View style={styles.modalBackButton} />
                  <Text style={styles.modalTitle}>{t('filterModal.title')}</Text>
                  <TouchableOpacity
                    style={styles.modalClearButton}
                    onPress={() => {
                      clearAllFilters();
                      // Don't close modal - let user see the cleared state
                      // closeFilterModal();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalClearButtonText}>{t('filterModal.clear')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <FilterScreen
                onApplyFilters={handleApplyFilters}
                onClose={closeFilterModal}
                onClearFilters={clearAllFilters}
                currentFilters={appliedFilters}
                isModal={true}
              />
            </Animated.View>
          </View>
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
                <Text style={styles.locModalTitle}>{t('farmerHome.locationModalTitle', 'Location')}</Text>
                <TouchableOpacity onPress={() => setIsLocationModalVisible(false)} style={styles.locCloseBtn}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.locPrivacyRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="lock-closed-outline" size={16} color="#10B981" />
                  <Text style={styles.locPrivacyLabel}>{t('farmerHome.locationPrivate', 'Private')}</Text>
                </View>
                <Text style={styles.locSetLabel}>{t('farmerHome.setLocation', 'Set Location')}</Text>
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
                  <Text style={styles.locPreviewPlaceholder}>{t('farmerHome.noLocation', 'No location set yet')}</Text>
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
                      Toast.show({ type: 'success', text1: t('farmerHome.locationUpdated', 'Location Updated'), position: 'bottom' });
                      setIsLocationModalVisible(false);
                    } else {
                      Toast.show({ type: 'error', text1: t('farmerHome.updateFailedTitle', 'Update Failed'), text2: t('farmerHome.updateFailedSubtitle', 'Could not save location. Try again.') });
                    }
                  } catch (e) {
                    console.error('Location update failed:', e?.message || e);
                    Toast.show({ type: 'error', text1: t('farmerHome.locationFailedTitle', 'Location Failed'), text2: e?.userMessage || t('farmerHome.locationFailedSubtitle', 'Unable to update location.') });
                  } finally {
                    setIsGettingLocation(false);
                  }
                }}
              >
                {isGettingLocation ? (
                  <Text style={styles.locActionBtnText}>{t('farmerHome.updating', 'Updating…')}</Text>
                ) : (
                  <Text style={styles.locActionBtnText}>{t('farmerHome.updateLocation', 'Update Location')}</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollViewContent: {
    paddingBottom: 90,
  },

  header: {
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
  fixedHeaderTitle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
  },
  fixedHeaderImage: {
    width: 152,
    height: 56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageButton: {
    padding: 2,
    borderRadius: 50,
  },
  profilePlaceholderButton: {
    padding: 6,
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
    width: 54,
    height: 54,
    padding: 12,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E0E0E08C',
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
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
    borderRadius: 20,
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
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
  filterBtn: {
    backgroundColor: '#E8F5E8',
    height: 52,
    width: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  editPreferences: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  categoriesContainer: {
    padding: 4,
    paddingRight: 18,
    gap: 10,
    paddingHorizontal: 16,
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
    color: '#374151',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  fruitsContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateIcon: {
    marginBottom: 20,
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 40,
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
    minHeight: '80%',
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
    opacity: 0, // Invisible spacer for symmetry
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    flex: 1,
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

  // Location modal styles
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locPrivacyRow: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
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
    backgroundColor: '#FAFAFA',
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
  locFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  locCancelBtn: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  locCancelText: {
    color: '#111827',
    fontWeight: '600',
  },
  locUpdateBtn: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  locUpdateText: {
    color: '#FFFFFF',
    fontWeight: '700',
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