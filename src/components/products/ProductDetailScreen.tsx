import React, { useState, ReactElement, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Platform,
  PanResponder,
  Animated,
  Alert,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants';
import { BuyerStackParamList } from '../../navigation/types';
import { type Fruit } from '../../types/fruit';
import { formatPrice, formatLocation, formatFruitQuantity, getRelativeTime, getDisplayParts } from '../../utils/formatters';
import { toggleWishlist, isInWishlist, getFruitLikesCount, getFruitLikers, syncFruitLikesCount, addToWishlist, removeFromWishlist, cleanupWishlistInconsistencies } from '../../services/wishlistService';
import Toast from 'react-native-toast-message';
import { auth, firestore } from '../../config/firebase';
import { increment } from '@react-native-firebase/firestore';
import { useRequests } from '../../hooks/useRequests';
import { useAuthState } from '../providers/AuthStateProvider';
import SendRequestModal from '../requests/SendRequestModal';
import { CreateRequestInput } from '../../types/Request';
import ErrorBoundary from '../common/ErrorBoundary';

const { width, height } = Dimensions.get('window');

// Enhanced Product interface with proper typing
interface Product extends Omit<Fruit, 'rating' | 'reviewCount'> {
  // Additional display properties for compatibility
  rating?: number;
  reviewCount?: number;
  sizes?: string[];
  freshness?: string;
  details?: string;
  image?: any; // For backward compatibility
  postedDate?: string;
  listedDate?: number; // Number of days since listing
  farmer_name?: string;
  farmer_rating?: number;
}

// Input validation helper
const validateRouteParams = (params: any): { isValid: boolean; product?: any; error?: string } => {
  if (!params) {
    return { isValid: false, error: 'No route parameters provided' };
  }
  
  if (!params.product) {
    return { isValid: false, error: 'No product data in route parameters' };
  }
  
  const product = params.product;
  if (!product.id && !params.productId) {
    return { isValid: false, error: 'Product ID is required but not provided' };
  }
  
  return { isValid: true, product };
};

type ProductDetailScreenProps = {
  navigation: StackNavigationProp<BuyerStackParamList, 'ProductDetail'>;
  route: RouteProp<BuyerStackParamList, 'ProductDetail'>;
};

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  // Component mounted flag to prevent memory leaks
  const isMountedRef = useRef(true);
  
  // Validate route params first
  const routeValidation = useMemo(() => validateRouteParams(route?.params), [route?.params]);
  
  // Early return with error handling for invalid params
  if (!routeValidation.isValid) {
    console.error('❌ Route validation failed:', routeValidation.error);
    
    useEffect(() => {
      Alert.alert(
        'Error',
        routeValidation.error || 'Product information not found. Please try again.',
        [{ text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BuyerTabs' as never) }]
      );
    }, [routeValidation.error, navigation]);

    // Return minimal error component
    return (
      <ErrorBoundary fallback={<Text>Error loading product details</Text>}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BuyerTabs' as never)}
            >
              <Ionicons name="arrow-back" size={24} color="#007E2F" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Product Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Loading product information...</Text>
          </View>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  const rawProduct = routeValidation.product;

  // Product data with actual data (fallback ID if missing)
  const product: Product = {
    // Use actual data - these should come from navigation params
    id: rawProduct.id || route?.params?.productId || 'unknown-id',
    name: rawProduct.name || 'Unknown Product',
    type: rawProduct.type || 'unknown',
    grade: rawProduct.grade || 'N/A',
    description: rawProduct.description || 'No description available',
    quantity: rawProduct.quantity || [1, 1],
    price_per_kg: rawProduct.price_per_kg || rawProduct.price || 0,
    availability_date: rawProduct.availability_date || new Date().toISOString(),
    image_urls: rawProduct.image_urls || [],
    location: rawProduct.location || {
      village: 'Unknown',
      district: 'Unknown',
      state: 'Unknown',
      pincode: '000000',
      lat: 0,
      lng: 0
    },
    farmer_id: rawProduct.farmer_id || 'unknown-farmer',
    status: rawProduct.status || 'active',
    views: rawProduct.views || 0,
    likes: rawProduct.likes || 0,
    created_at: rawProduct.created_at || new Date().toISOString(),
    updated_at: rawProduct.updated_at || new Date().toISOString(),
    // Display properties with reasonable fallbacks
    rating: rawProduct.rating || 4.0,
    reviewCount: rawProduct.reviewCount || 0,
    sizes: rawProduct.sizes || ['1 kg', '500 gm', '2 kg'],
    freshness: rawProduct.freshness || 'Fresh',
    details: rawProduct.details || `${rawProduct.name || 'Product'} from ${rawProduct.location ? formatLocation(rawProduct.location) : 'Unknown location'}`,
    postedDate: rawProduct.postedDate || (rawProduct.created_at ? getRelativeTime(rawProduct.created_at) : 'Recently'),
    farmer_name: 'Unknown Farmer', // Will be updated with farmerData later
    farmer_rating: rawProduct.farmer_rating || 4.0
  };

  const relativeTime = getRelativeTime(product.created_at);
  const [topText, bottomText] = getDisplayParts(relativeTime);

  // Consolidated state management
  const [screenState, setScreenState] = useState(() => ({
    isFavorite: false,
    selectedImageIndex: 0,
    isWishlistLoading: false,
    currentLikes: product.likes || 0,
    farmerData: null as any,
    farmerReviews: [] as any[],
    isFarmerDataLoading: true,
    showRequestModal: false,
    requestCount: 0,
    hasExistingRequestForProduct: false,
    isCheckingExistingRequest: true,
  }));

  // Auth context
  const { user, userRole } = useAuthState();
  const { createRequest, getProductRequestCounts, hasExistingRequest } = useRequests();

  // Destructure state for easier access
  const {
    isFavorite,
    selectedImageIndex,
    isWishlistLoading,
    currentLikes,
    farmerData,
    farmerReviews,
    isFarmerDataLoading,
    showRequestModal,
    requestCount,
    hasExistingRequestForProduct,
    isCheckingExistingRequest,
  } = screenState;

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state updater to prevent memory leaks
  const safeSetState = useCallback((updater: (prev: typeof screenState) => typeof screenState) => {
    if (isMountedRef.current) {
      setScreenState(updater);
    }
  }, []);

  // Helper functions for common state updates
  const setCurrentLikes = useCallback((likes: number) => {
    safeSetState(prev => ({ ...prev, currentLikes: likes }));
  }, [safeSetState]);

  const setIsFavorite = useCallback((favorite: boolean) => {
    safeSetState(prev => ({ ...prev, isFavorite: favorite }));
  }, [safeSetState]);

  const setSelectedImageIndex = useCallback((index: number) => {
    safeSetState(prev => ({ ...prev, selectedImageIndex: index }));
  }, [safeSetState]);

  const setIsWishlistLoading = useCallback((loading: boolean) => {
    safeSetState(prev => ({ ...prev, isWishlistLoading: loading }));
  }, [safeSetState]);

  const setFarmerData = useCallback((data: any) => {
    safeSetState(prev => ({ ...prev, farmerData: data }));
  }, [safeSetState]);

  const setFarmerReviews = useCallback((reviews: any[]) => {
    safeSetState(prev => ({ ...prev, farmerReviews: reviews }));
  }, [safeSetState]);

  const setIsFarmerDataLoading = useCallback((loading: boolean) => {
    safeSetState(prev => ({ ...prev, isFarmerDataLoading: loading }));
  }, [safeSetState]);

  const setShowRequestModal = useCallback((show: boolean) => {
    safeSetState(prev => ({ ...prev, showRequestModal: show }));
  }, [safeSetState]);

  const setRequestCount = useCallback((count: number) => {
    safeSetState(prev => ({ ...prev, requestCount: count }));
  }, [safeSetState]);

  const setHasExistingRequestForProduct = useCallback((hasExisting: boolean) => {
    safeSetState(prev => ({ ...prev, hasExistingRequestForProduct: hasExisting }));
  }, [safeSetState]);

  const setIsCheckingExistingRequest = useCallback((checking: boolean) => {
    safeSetState(prev => ({ ...prev, isCheckingExistingRequest: checking }));
  }, [safeSetState]);

  // Stable callbacks with memory leak prevention
  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('BuyerTabs' as never);
    }
  }, [navigation]);

  const handleImageChange = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, [setSelectedImageIndex]);

  // Memoized calculations to prevent unnecessary computations
  const minQuantity = useMemo(() => {
    return Array.isArray(product.quantity) ? product.quantity[0] : 1;
  }, [product.quantity]);

  const swipeThreshold = useMemo(() => {
    return width * 0.3; // 30% of screen width
  }, [width]);

  // Memoized product validation
  const hasValidProductData = useMemo(() => {
    return !!(product.id && product.name && product.farmer_id);
  }, [product.id, product.name, product.farmer_id]);

  // Animation values for the swipe-to-request button
  const pan = useRef(new Animated.Value(0)).current;

  console.log('✅ Final product object:', {
    id: product.id,
    name: product.name,
    imageCount: product.image_urls?.length || 0,
    farmer_id: product.farmer_id,
    farmer_name: product.farmer_name,
    hasAllData: !!(product.id && product.name && product.farmer_id)
  });

  // Debug: Log farmer information
  console.log('🔍 Farmer info debugging:', {
    'rawProduct.farmer_id': rawProduct.farmer_id,
    'rawProduct.farmer_name': rawProduct.farmer_name,
    'product.farmer_id': product.farmer_id,
    'product.farmer_name': product.farmer_name,
    'farmer_id_type': typeof product.farmer_id,
    'farmer_id_length': product.farmer_id?.length
  });

  // Initialize fresh data from Firestore on each screen load
  useEffect(() => {
    // Always fetch fresh data from Firestore on screen load
    syncFreshDataFromFirestore();
  }, [product.id]);

  // Sync fresh wishlist status and likes count from Firestore - OPTIMIZED
  const syncFreshDataFromFirestore = async () => {
    try {
      if (!product.id || product.id === 'unknown-id') {
        setCurrentLikes(Math.max(0, product.likes || 0));
        return;
      }

      console.log('🔄 Quick sync for product:', product.id);

      // Fast, single read from fruit document
      const likesCount = await syncFruitLikesCount(product.id);
      setCurrentLikes(Math.max(0, likesCount));

    } catch (error) {
      console.error('❌ Error syncing data:', error);
      // Use product data as fallback
      setCurrentLikes(Math.max(0, product.likes || 0));
    }
  };

  // Check wishlist status on component mount and increment view count
  useEffect(() => {
    if (!hasValidProductData) {
      console.warn('⚠️ Skipping wishlist/view initialization - invalid product data');
      return;
    }

    // Debug authentication
    const user = auth.currentUser;
    console.log('🔐 Current user:', user ? `${user.uid}` : 'Not authenticated');
    console.log('📱 New Wishlist Structure Info:');
    console.log('   📂 User likes are stored in: fruits/' + product.id + '/wishlists/' + (user?.uid || 'USER_ID'));
    console.log('   📂 User wishlist is also in: buyers/' + (user?.uid || 'USER_ID') + '/wishlist/' + product.id);
    console.log('   ❤️ When user likes: creates document in both locations');
    console.log('   🗑️ When user unlikes: removes document from both locations');

    checkWishlistStatus();
    incrementViewCount();
    fetchFarmerData();
  }, [product.id, product.farmer_id, hasValidProductData]);

  // Load request counts for farmers (only if user is a farmer viewing their own product)
  useEffect(() => {
    const loadRequestCount = async () => {
      if (userRole === 'farmer' && user?.uid === product.farmer_id && product.id) {
        try {
          const counts = await getProductRequestCounts([product.id]);
          const productCount = counts.find(c => c.productId === product.id);
          setRequestCount(productCount?.count || 0);
        } catch (error) {
          console.error('Error loading request count:', error);
        }
      }
    };

    loadRequestCount();
  }, [product.id, product.farmer_id, userRole, user?.uid]);

  // Check for existing requests when component loads
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (userRole === 'buyer' && user?.uid && product.id) {
        try {
          console.log('🔍 Checking for existing request...');
          const hasExisting = await hasExistingRequest(product.id);
          setHasExistingRequestForProduct(hasExisting);
          console.log('✅ Existing request check complete:', hasExisting);
        } catch (error) {
          console.error('❌ Error checking existing request:', error);
        } finally {
          setIsCheckingExistingRequest(false);
        }
      } else {
        setIsCheckingExistingRequest(false);
      }
    };

    checkExistingRequest();
  }, [product.id, userRole, user?.uid, hasExistingRequest]);

  // Refresh data when screen comes into focus to handle stale state - OPTIMIZED
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Screen focused, quick refresh...');
      // Simple, fast refresh without complex cleanup operations
      const refreshData = async () => {
        try {
          // Small delay to ensure any pending operations complete
          await new Promise(resolve => setTimeout(resolve, 100));

          // Fast parallel operations
          const [freshWishlistStatus, freshLikesCount] = await Promise.all([
            isInWishlist(product.id),
            syncFruitLikesCount(product.id)
          ]);

          // Update UI with fresh data
          setIsFavorite(freshWishlistStatus);
          setCurrentLikes(Math.max(0, freshLikesCount));

          // Check existing request status for buyers
          if (userRole === 'buyer' && user?.uid) {
            try {
              const freshExistingRequest = await hasExistingRequest(product.id);
              setHasExistingRequestForProduct(freshExistingRequest);
              console.log('✅ Quick refresh complete:', freshWishlistStatus ? '❤️' : '🤍', 'likes:', freshLikesCount, 'existing request:', freshExistingRequest);
            } catch (error) {
              console.error('❌ Error checking existing request during refresh:', error);
            }
          } else {
            console.log('✅ Quick refresh complete:', freshWishlistStatus ? '❤️' : '🤍', 'likes:', freshLikesCount);
          }
        } catch (error) {
          console.error('❌ Error during focus refresh:', error);
        }
      };

      refreshData();
    }, [product.id, userRole, user?.uid])
  );

  const fetchFarmerData = async () => {
    if (!product.farmer_id || product.farmer_id === 'unknown-farmer') {
      console.log('⚠️ No valid farmer ID, skipping farmer data fetch');
      console.log('⚠️ farmer_id value:', product.farmer_id);
      setIsFarmerDataLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching farmer data for ID:', product.farmer_id);
      console.log('🔍 farmer_id type:', typeof product.farmer_id);
      console.log('🔍 farmer_id length:', product.farmer_id?.length);
      setIsFarmerDataLoading(true);

      // Fetch farmer profile
      const farmerDoc = await firestore
        .collection('farmers')
        .doc(product.farmer_id)
        .get();

      console.log('🔍 Farmer document exists:', farmerDoc.exists());

      if (farmerDoc.exists()) {
        const farmer = farmerDoc.data();
        console.log('✅ Farmer data fetched:', farmer);
        console.log('✅ Farmer name field:', farmer?.displayName);
        console.log('✅ All farmer fields:', Object.keys(farmer || {}));
        setFarmerData(farmer);
      } else {
        console.log('⚠️ Farmer document not found for ID:', product.farmer_id);
        console.log('⚠️ Checking if this is a valid Firestore document ID...');

        // Try to fetch all farmers to see what IDs exist (for debugging)
        const allFarmersSnapshot = await firestore
          .collection('farmers')
          .limit(5)
          .get();

        console.log('🔍 Sample farmer IDs in collection:');
        allFarmersSnapshot.docs.forEach((doc: any) => {
          console.log('  -', doc.id, '(data:', Object.keys(doc.data() || {}), ')');
        });
      }

      // Fetch farmer reviews (if available)
      const reviewsSnapshot = await firestore
        .collection('reviews')
        .where('farmer_id', '==', product.farmer_id)
        .orderBy('created_at', 'desc')
        .limit(5)
        .get();

      const reviews = reviewsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Found ${reviews.length} reviews for farmer:`, product.farmer_id);
      setFarmerReviews(reviews);

    } catch (error: any) {
      console.error('❌ Error fetching farmer data:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        farmer_id: product.farmer_id
      });
      // Continue with default data on error
    } finally {
      setIsFarmerDataLoading(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      // Ensure we have a valid product ID before checking wishlist
      if (!product.id || product.id === 'unknown-id') {
        console.log('⚠️ Invalid product ID, skipping wishlist check:', product.id);
        setIsFavorite(false);
        return;
      }

      // Get current user
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ User not authenticated, cannot check wishlist');
        setIsFavorite(false);
        return;
      }

      console.log('🔍 Getting wishlist status (optimized) for:', product.id);

      // Fast parallel operations
      const [isWishlisted, likesCount] = await Promise.all([
        isInWishlist(product.id),
        syncFruitLikesCount(product.id)
      ]);

      setIsFavorite(isWishlisted);
      setCurrentLikes(Math.max(0, likesCount));

      console.log('✅ Wishlist data loaded:', isWishlisted ? '❤️ LIKED' : '🤍 NOT_LIKED', 'likes:', likesCount);

    } catch (error) {
      console.error('❌ Error checking wishlist status:', error);
      // Default to false on error
      setIsFavorite(false);
      setCurrentLikes(Math.max(0, product.likes || 0));
    }
  };

  // Increment view count when product detail screen is opened
  const incrementViewCount = async () => {
    try {
      console.log('📈 Incrementing view count for fruit:', product.id);

      // First check if the document exists
      const fruitDoc = await firestore
        .collection('fruits')
        .doc(product.id)
        .get();

      if (!fruitDoc.exists) {
        console.log('⚠️ Fruit document does not exist in Firestore:', product.id);
        console.log('⚠️ This might be sample/test data. Skipping view count increment.');
        return;
      }

      await firestore
        .collection('fruits')
        .doc(product.id)
        .update({
          views: increment(1)
        });
      console.log('✅ View count incremented for fruit:', product.id);
    } catch (error: any) {
      console.error('❌ Error incrementing view count:', error);
      if (error?.code === 'firestore/not-found') {
        console.log('⚠️ Document not found - this might be sample data:', product.id);
      }
      // Don't throw error for view count failures
    }
  };

  const handleWishlistToggle = async () => {
    if (isWishlistLoading) return;

    console.log('🔄 Starting wishlist toggle for fruit:', product.id);
    console.log('🔄 Current UI state - wishlist:', isFavorite ? 'LIKED ❤️' : 'UNLIKED 🤍', 'likes:', currentLikes);

    // Store previous state for reverting on error
    const previousWishlistStatus = isFavorite;
    const previousLikeCount = currentLikes;

    setIsWishlistLoading(true);

    try {
      // First, get the ACTUAL current state from Firestore (not UI state)
      console.log('🔍 Getting actual current state from Firestore...');
      const actualCurrentStatus = await isInWishlist(product.id);
      const actualCurrentLikesCount = await getFruitLikesCount(product.id);

      console.log('� Actual Firestore state - wishlist:', actualCurrentStatus ? 'LIKED ❤️' : 'UNLIKED 🤍', 'likes:', actualCurrentLikesCount);

      // Determine what action to take based on ACTUAL state, not UI state
      const shouldAddToWishlist = !actualCurrentStatus;

      console.log('🔄 Action to take:', shouldAddToWishlist ? 'ADD to wishlist' : 'REMOVE from wishlist');

      // Perform the toggle operation
      let newStatus;
      if (shouldAddToWishlist) {
        await addToWishlist(product.id);
        newStatus = true;
        console.log('✅ Added to wishlist');
      } else {
        await removeFromWishlist(product.id);
        newStatus = false;
        console.log('✅ Removed from wishlist');
      }

      // Wait a bit for Firestore consistency
      console.log('⏳ Waiting for Firestore consistency...');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the fresh count from Firestore (single read)
      const freshLikesCount = await syncFruitLikesCount(product.id);
      console.log('📊 Fresh likes count after toggle:', freshLikesCount);

      // Update UI with final state
      setIsFavorite(newStatus);
      setCurrentLikes(Math.max(0, freshLikesCount));

      console.log('✅ UI updated - wishlist:', newStatus ? 'LIKED ❤️' : 'UNLIKED 🤍', 'likes:', freshLikesCount);



    } catch (error) {
      console.error('❌ Error toggling wishlist:', error);

      // On error, refresh the actual state from Firestore instead of reverting to old UI state
      try {
        console.log('🔄 Error occurred, refreshing actual state from Firestore...');
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for Firestore
        const actualStatus = await isInWishlist(product.id);
        const actualCount = await syncFruitLikesCount(product.id);

        setIsFavorite(actualStatus);
        setCurrentLikes(Math.max(0, actualCount));

        console.log('✅ Refreshed to actual Firestore state - wishlist:', actualStatus ? 'LIKED ❤️' : 'UNLIKED 🤍', 'likes:', actualCount);
      } catch (refreshError) {
        console.error('❌ Error refreshing state:', refreshError);
        // As last resort, revert to previous UI state
        setIsFavorite(previousWishlistStatus);
        setCurrentLikes(previousLikeCount);
      }

      Toast.show({
        type: 'error',
        text1: '❌ Wishlist Error',
        text2: 'Unable to update wishlist. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // PanResponder for swipe gesture
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasExistingRequestForProduct && !isCheckingExistingRequest,
      onPanResponderMove: (_, gesture) => {
        // Only allow movement to the right (positive x direction) if no existing request
        if (gesture.dx > 0 && !hasExistingRequestForProduct) {
          // Limit max swipe distance to 70% of container width
          const maxDistance = width * 0.85 - 60;
          const dx = Math.min(gesture.dx, maxDistance);
          pan.setValue(dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // If swiped far enough and no existing request, trigger the request action
        if (gesture.dx >= swipeThreshold && !hasExistingRequestForProduct) {
          // Animate to the end position
          Animated.spring(pan, {
            toValue: width * 0.85 - 60,
            useNativeDriver: false,
          }).start(() => {
            // Handle the request action
            handleRequestProduct();
            // Reset after a delay
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: 0,
                useNativeDriver: false,
              }).start();
            }, 1000);
          });
        } else {
          // Spring back to start
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    }), [hasExistingRequestForProduct, isCheckingExistingRequest, pan, width, swipeThreshold]);

  // Function to handle the product request
  const handleRequestProduct = async () => {
    // Check if user is authenticated and is a buyer
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login to send requests to farmers.",
        [{ text: "OK" }]
      );
      return;
    }

    if (userRole !== 'buyer') {
      Alert.alert(
        "Access Denied",
        "Only buyers can send requests to farmers.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check if user is trying to request their own product
    if (user.uid === product.farmer_id) {
      Alert.alert(
        "Invalid Request",
        "You cannot send a request for your own product.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check for existing requests
    try {
      console.log('🔍 Checking for existing requests for product:', product.id);
      const hasExisting = await hasExistingRequest(product.id);

      if (hasExisting) {
        Alert.alert(
          "Request Already Sent",
          "You have already sent a request for this product. Please wait for the farmer to respond or check your requests in the Orders section.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log('✅ No existing request found, showing request modal');
    } catch (error) {
      console.error('❌ Error checking existing requests:', error);
      Alert.alert(
        "Error",
        "Unable to check existing requests. Please try again.",
        [{ text: "OK" }]
      );
      return;
    }

    // Show the request modal
    setShowRequestModal(true);
  };

  // Handle sending the request
  const handleSendRequest = async (requestData: CreateRequestInput) => {
    try {
      const requestId = await createRequest(requestData);
      if (requestId) {
        // Update local request count
        setRequestCount(requestCount + 1);

        // Update existing request status
        setHasExistingRequestForProduct(true);

        Toast.show({
          type: 'success',
          text1: 'Request Sent!',
          position: 'bottom',
          text2: `Your request has been sent to ${product.farmer_name || 'the farmer'}.`,
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert(
        'Error',
        'Failed to send request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderStars = (rating: number): ReactElement[] => {
    const stars: ReactElement[] = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFB800" style={styles.star} />);
      } else if (i === fullStars && halfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFB800" style={styles.star} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFB800" style={styles.star} />);
      }
    }
    return stars;
  };

  return (
    <ErrorBoundary fallback={
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FFFFFF" translucent={false} barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#007E2F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            Something went wrong while loading product details.
          </Text>
          <TouchableOpacity onPress={handleBackPress} style={{ backgroundColor: '#007E2F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    }>
      <SafeAreaView style={styles.container}>
        <StatusBar
          backgroundColor="#FFFFFF"
          translucent={false}
          barStyle="dark-content"
        />

        {/* Header with Back Button and Title */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007E2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity
          style={[
            styles.favoriteButton,
            isWishlistLoading && { opacity: 0.6 },
            isFavorite && styles.favoriteButtonActive
          ]}
          onPress={handleWishlistToggle}
          disabled={isWishlistLoading}
          activeOpacity={0.7}
        >
          {isWishlistLoading ? (
            <Ionicons name="heart-outline" size={24} color="#999999" />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FF6B6B" : "#007E2F"}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
       >
        {/* Modern Product Image Section */}
        <View style={styles.modernImageSection}>
          {product.image_urls && product.image_urls.length > 0 ? (
            <>
              {/* Main Image Container with Modern Design */}
              <View style={styles.modernImageContainer}>
                <Image
                  source={{ uri: product.image_urls[selectedImageIndex] }}
                  style={styles.modernProductImage}
                  resizeMode="cover"
                />

                {/* Status Badge - Modern Style */}
                <View style={styles.modernStatusBadge}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.modernStatusText}>{product.status?.toUpperCase()}</Text>
                </View>

                {/* Image Counter - Modern Style */}
                {product.image_urls.length > 1 && (
                  <View style={styles.modernImageCounter}>
                    <Text style={styles.modernImageCounterText}>
                      {selectedImageIndex + 1}/{product.image_urls.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Modern Thumbnail Carousel with Dots */}
              {product.image_urls.length > 1 && (
                <View style={styles.modernThumbnailSection}>
                  <FlatList
                    data={product.image_urls}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modernThumbnailContainer}
                    keyExtractor={(item, index) => `image-${index}`}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        style={[
                          styles.modernThumbnailWrapper,
                          selectedImageIndex === index && styles.modernSelectedThumbnail
                        ]}
                        onPress={() => setSelectedImageIndex(index)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: item }}
                          style={styles.modernThumbnailImage}
                          resizeMode="cover"
                        />
                        {selectedImageIndex === index && (
                          <View style={styles.thumbnailOverlay}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  />

                  {/* Dots Indicator */}
                  <View style={styles.dotsContainer}>
                    {product.image_urls.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dot,
                          selectedImageIndex === index && styles.activeDot
                        ]}
                        onPress={() => setSelectedImageIndex(index)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.modernImageContainer}>
              {/* Modern Fallback for no images */}
              <View style={styles.modernImagePlaceholder}>
                <View style={styles.placeholderIconContainer}>
                  <Ionicons name="image-outline" size={60} color="#007E2F" />
                </View>
                <Text style={styles.placeholderText}>No images available</Text>
              </View>

              {/* Status Badge */}
              <View style={styles.modernStatusBadge}>
                <View style={styles.statusIndicator} />
                <Text style={styles.modernStatusText}>{product.status?.toUpperCase()}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Modern Product Info Card */}
        <View style={styles.modernProductCard}>
          {/* Product Header - Name, Grade, Type */}
          <View style={styles.modernProductHeaderSection}>
            <Text style={styles.modernProductName}>{product.name}</Text>
            <View style={styles.modernGradeTypeContainer}>
              <View style={styles.modernGradeBadge}>
                <Ionicons name="ribbon" size={14} color="#007E2F" />
                <Text style={styles.modernGradeText}>Grade {product.grade}</Text>
              </View>
              <View style={styles.modernTypeBadge}>
                <Ionicons name="leaf" size={14} color="#666666" />
                <Text style={styles.modernTypeText}>{product.type}</Text>
              </View>
            </View>
          </View>

          {/* Modern Price Section */}
          <View style={styles.modernPriceSection}>
            <View style={styles.priceWithIcon}>
              <Ionicons name="pricetag" size={20} color="#007E2F" />
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Price per KG</Text>
                <Text style={styles.modernPrice}>₹{product.price_per_kg}</Text>
              </View>
            </View>
          </View>

          {/* Modern Engagement Stats */}
          <View style={styles.modernEngagementContainer}>
            <View style={styles.engagementStatsWrapper}>
              <View style={styles.modernEngagementStat}>
                <View style={styles.engagementIconContainer}>
                  <Ionicons name="eye" size={18} color="#007E2F" />
                </View>
                <View style={styles.engagementTextContainer}>
                  <Text style={styles.modernEngagementNumber}>{product.views || 0}</Text>
                  <Text style={styles.engagementLabel}>views</Text>
                </View>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.modernEngagementStat}>
                <TouchableOpacity
                  style={[
                    styles.engagementIconContainer,
                    {
                      backgroundColor: isFavorite ? '#FFE8E8' : '#E8F5E8',
                      opacity: isWishlistLoading ? 0.6 : 1.0,
                      transform: [{ scale: isWishlistLoading ? 0.95 : 1.0 }]
                    }
                  ]}
                  onPress={handleWishlistToggle}
                  disabled={isWishlistLoading}
                  activeOpacity={0.7}
                >
                  {isWishlistLoading ? (
                    <Ionicons
                      name="heart-outline"
                      size={18}
                      color="#999999"
                    />
                  ) : (
                    <Ionicons
                      name={isFavorite ? "heart" : "heart-outline"}
                      size={18}
                      color={isFavorite ? "#FF6B6B" : "#007E2F"}
                    />
                  )}
                </TouchableOpacity>
                <View style={styles.engagementTextContainer}>
                  <Text style={[
                    styles.modernEngagementNumber,
                    isFavorite && { color: '#FF6B6B' },
                    isWishlistLoading && { opacity: 0.6 }
                  ]}>
                    {currentLikes}
                  </Text>
                  <Text style={[
                    styles.engagementLabel,
                    isWishlistLoading && { opacity: 0.6 }
                  ]}>
                    likes
                  </Text>
                </View>
              </View>

              {/* Request Count - Only visible to farmers for their own products */}
              {userRole === 'farmer' && user?.uid === product.farmer_id && (
                <>
                  <View style={styles.statsDivider} />
                  <View style={styles.modernEngagementStat}>
                    <View style={[
                      styles.engagementIconContainer,
                      { backgroundColor: '#FFF3E0' }
                    ]}>
                      <Ionicons name="mail-outline" size={18} color="#FF9800" />
                    </View>
                    <View style={styles.engagementTextContainer}>
                      <Text style={[styles.modernEngagementNumber, { color: '#FF9800' }]}>
                        {requestCount}
                      </Text>
                      <Text style={styles.engagementLabel}>requests</Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.statsDivider} />

              <View style={styles.modernEngagementStat}>
                <View style={styles.engagementIconContainer}>
                  <Ionicons name="time" size={18} color="#007E2F" />
                </View>
                <View style={styles.engagementTextContainer}>
                  <Text style={styles.modernEngagementNumber}>
                    {topText}
                  </Text>
                  <Text style={styles.engagementLabel}>{bottomText}</Text>
                </View>
              </View>
            </View>

            {isFavorite && (
              <View style={styles.modernWishlistBadge}>
                <Ionicons name="heart" size={14} color="#FF6B6B" />
                <Text style={styles.modernWishlistText}>In Wishlist</Text>
              </View>
            )}
          </View>

          <View style={styles.modernDivider} />

          {/* Description Section */}
          {product.description && (
            <>
              <View style={styles.modernDetailSection}>
                <Text style={styles.modernSectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
              <View style={styles.modernDivider} />
            </>
          )}

          {/* Modern Product Details Grid */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Product Details</Text>
            <View style={styles.modernDetailsGrid}>
              {/* Type and Grade */}
              <View style={styles.modernDetailCard}>
                <View style={styles.modernDetailIconContainer}>
                  <Ionicons name="leaf-outline" size={22} color="#007E2F" />
                </View>
                <View style={styles.modernDetailContent}>
                  <Text style={styles.modernDetailLabel}>Fruit Type</Text>
                  <Text style={styles.modernDetailValue}>{product.type}</Text>
                </View>
              </View>

              <View style={styles.modernDetailCard}>
                <View style={styles.modernDetailIconContainer}>
                  <Ionicons name="ribbon-outline" size={22} color="#007E2F" />
                </View>
                <View style={styles.modernDetailContent}>
                  <Text style={styles.modernDetailLabel}>Quality Grade</Text>
                  <Text style={styles.modernDetailValue}>Grade {product.grade}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={[styles.modernDetailCard, styles.fullWidthCard]}>
                <View style={[
                  styles.modernDetailIconContainer,
                  { backgroundColor: product.status === 'active' ? '#E8F5E8' : '#FFF3E0' }
                ]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={product.status === 'active' ? '#4CAF50' : '#FF9800'}
                  />
                </View>
                <View style={styles.modernDetailContent}>
                  <Text style={styles.modernDetailLabel}>Availability Status</Text>
                  <Text style={[
                    styles.modernDetailValue,
                    {
                      color: product.status === 'active' ? '#4CAF50' : '#FF9800',
                      fontWeight: '700'
                    }
                  ]}>
                    {product.status?.charAt(0).toUpperCase() + product.status?.slice(1) || 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.modernDivider} />

          {/* Quantity Information */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Available Quantity</Text>
            <View style={styles.quantityCard}>
              <View style={styles.quantityIconContainer}>
                <Ionicons name="scale-outline" size={24} color="#007E2F" />
              </View>
              <View style={styles.quantityDetails}>
                <Text style={styles.quantityText}>
                  {formatFruitQuantity(product.quantity)}
                </Text>
                <Text style={styles.quantitySubtext}>Total available</Text>
              </View>
            </View>
          </View>

          <View style={styles.modernDivider} />

          {/* Location Details - Modern with Privacy */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Location Details</Text>
            <View style={styles.modernLocationCard}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={24} color="#007E2F" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationPrimary}>{product.location.village}</Text>
                <Text style={styles.locationSecondary}>
                  {product.location.district}, {product.location.state}
                </Text>
                <Text style={styles.locationTertiary}>
                  PIN: {product.location.pincode}
                </Text>
                {/* Privacy: Don't show exact coordinates to buyers */}
                <View style={styles.locationPrivacyNote}>
                  <Ionicons name="shield-checkmark" size={14} color="#666666" />
                  <Text style={styles.privacyText}>
                    Exact location shared after order confirmation
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.modernDivider} />

          {/* Availability Information */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Availability</Text>
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityRow}>
                <Ionicons name="calendar-outline" size={20} color="#007E2F" />
                <View style={styles.availabilityTextContainer}>
                  <Text style={styles.availabilityLabel}>Available from</Text>
                  <Text style={styles.availabilityValue}>
                    {new Date(product.availability_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.modernDivider} />

          {/* Timestamps */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Listing Information</Text>
            <View style={styles.timestampCard}>
              <View style={styles.timestampRow}>
                <Ionicons name="add-circle-outline" size={20} color="#666666" />
                <View style={styles.timestampTextContainer}>
                  <Text style={styles.timestampLabel}>Created</Text>
                  <Text style={styles.timestampValue}>
                    {new Date(product.created_at).toLocaleDateString('en-IN')} at{' '}
                    {new Date(product.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.timestampRow}>
                <Ionicons name="create-outline" size={20} color="#666666" />
                <View style={styles.timestampTextContainer}>
                  <Text style={styles.timestampLabel}>Last updated</Text>
                  <Text style={styles.timestampValue}>
                    {new Date(product.updated_at).toLocaleDateString('en-IN')} at{' '}
                    {new Date(product.updated_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.modernDivider} />

          {/* Modern Farmer Details Section */}
          <View style={styles.modernDetailSection}>
            <Text style={styles.modernSectionTitle}>Farmer Information</Text>

            {isFarmerDataLoading ? (
              <View style={styles.modernFarmerCard}>
                <View style={styles.farmerLoadingContainer}>
                  <View style={styles.loadingAvatar}>
                    <View style={styles.loadingIndicator} />
                  </View>
                  <View style={styles.farmerLoadingInfo}>
                    <View style={styles.loadingTextLine} />
                    <View style={styles.loadingTextLineShort} />
                    <View style={styles.loadingTextLineTiny} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.modernFarmerCard}>
                  <View style={styles.modernFarmerHeader}>
                    <View style={styles.farmerAvatarContainer}>
                      <View style={[
                        styles.modernFarmerAvatar,
                        { backgroundColor: farmerData?.avatar_color || '#007E2F' }
                      ]}>
                        {farmerData?.profile_image_url ? (
                          <Image
                            source={{ uri: farmerData.profile_image_url }}
                            style={styles.farmerProfileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.modernFarmerAvatarText}>
                            {(farmerData?.displayName || 'F').charAt(0).toUpperCase()
                            }</Text>
                        )}
                      </View>
                      {farmerData?.is_verified && (
                        <View style={styles.verificationBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        </View>
                      )}
                    </View>

                    <View style={styles.modernFarmerInfo}>
                      <Text style={styles.modernFarmerName}>
                        {(() => {
                          const displayName = farmerData?.displayName || 'Unknown Farmer';
                          console.log('🔍 Farmer name display logic:', {
                            'farmerData?.displayName': farmerData?.displayName,
                            'product.farmer_name': product.farmer_name,
                            'final_display_name': displayName,
                            'farmerData_exists': !!farmerData,
                            'farmerData_keys': farmerData ? Object.keys(farmerData) : null
                          });
                          return displayName;
                        })()}
                      </Text>

                      <View style={styles.farmerRatingContainer}>
                        <View style={styles.modernStarsContainer}>
                          {renderStars(farmerData?.average_rating || product.farmer_rating || 4.0)}
                        </View>
                        <Text style={styles.modernRatingText}>
                          {(farmerData?.average_rating || product.farmer_rating || 4.0).toFixed(1)}
                        </Text>
                        <Text style={styles.reviewCountText}>
                          ({farmerData?.total_reviews || farmerReviews.length || 0} reviews)
                        </Text>
                      </View>

                      {/* Farmer Stats */}
                      <View style={styles.farmerStatsRow}>
                        {farmerData?.experience_years && (
                          <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={14} color="#666666" />
                            <Text style={styles.statText}>{farmerData.experience_years}y exp</Text>
                          </View>
                        )}
                        {farmerData?.total_products && (
                          <View style={styles.statItem}>
                            <Ionicons name="leaf-outline" size={14} color="#666666" />
                            <Text style={styles.statText}>{farmerData.total_products} products</Text>
                          </View>
                        )}
                        {farmerData?.location && (
                          <View style={styles.statItem}>
                            <Ionicons name="location-outline" size={14} color="#666666" />
                            <Text style={styles.statText}>
                              {farmerData.location.village}, {farmerData.location.district}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Farmer Description */}
                  {farmerData?.description && (
                    <View style={styles.farmerDescriptionContainer}>
                      <Text style={styles.farmerDescription} numberOfLines={3}>
                        {farmerData.description}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Modern Reviews Section */}
                {farmerReviews.length > 0 && (
                  <>
                    <View style={styles.modernReviewsHeader}>
                      <Text style={styles.modernReviewsTitle}>Recent Reviews</Text>
                      <View style={styles.reviewsCountBadge}>
                        <Text style={styles.reviewsCountText}>{farmerReviews.length}</Text>
                      </View>
                    </View>

                    <View style={styles.modernReviewsList}>
                      {farmerReviews.slice(0, 3).map((review, index) => (
                        <View key={review.id || index} style={styles.modernReviewItem}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewerAvatar}>
                              <Text style={styles.reviewerAvatarText}>
                                {(review.buyer_name || 'A').charAt(0).toUpperCase()
                                }</Text>
                            </View>
                            <View style={styles.reviewInfo}>
                              <View style={styles.reviewTopRow}>
                                <Text style={styles.reviewerName}>
                                  {review.buyer_name || 'Anonymous'}
                                </Text>
                                <Text style={styles.reviewDate}>
                                  {review.created_at ? getRelativeTime(review.created_at) : 'Recently'}
                                </Text>
                              </View>
                              <View style={styles.reviewRatingContainer}>
                                {renderStars(review.rating || 4)}
                              </View>
                            </View>
                          </View>
                          {review.comment && (
                            <Text style={styles.modernReviewComment} numberOfLines={2}>
                              "{review.comment}"
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>

                    {farmerReviews.length > 3 && (
                      <TouchableOpacity style={styles.modernViewMoreButton}>
                        <Text style={styles.modernViewMoreText}>
                          View all {farmerReviews.length} reviews
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#007E2F" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}

            <View style={styles.modernContactNote}>
              <Ionicons name="chatbubble-outline" size={20} color="#007E2F" />
              <Text style={styles.modernContactText}>
                Contact this farmer to place your order or ask questions about the product.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modern Swipe to Request Action */}
      <View style={styles.modernSwipeContainer}>
        <View style={styles.modernSwipeTrack}>
          <Animated.View
            style={[
              styles.modernSwipeThumb,
              {
                transform: [{ translateX: pan }],
                backgroundColor: hasExistingRequestForProduct ? '#6B7280' : '#10B981'
              }
            ]}
            {...panResponder.panHandlers}
          >
            <Ionicons
              name={hasExistingRequestForProduct ? "checkmark" : "arrow-forward"}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
          <Text style={[
            styles.modernSwipeText,
            hasExistingRequestForProduct && { color: '#6B7280' }
          ]}>
            {isCheckingExistingRequest
              ? 'Checking...'
              : hasExistingRequestForProduct
                ? 'Request already sent'
                : 'Swipe to request'
            }
          </Text>
          <View style={styles.swipeGradientOverlay} />
        </View>
        <Text style={styles.modernSwipeInstruction}>
          {hasExistingRequestForProduct
            ? 'You have already sent a request for this product'
            : `Swipe right to send a request to ${farmerData?.displayName || 'the farmer'}`
          }
        </Text>
      </View>

      {/* Send Request Modal */}
      <SendRequestModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSend={handleSendRequest}
        product={{
          id: product.id,
          name: product.name,
          price: product.price_per_kg,
          priceUnit: 'kg',
          farmerName: farmerData?.displayName || 'Unknown Farmer',
          quantity: product.quantity,
        }}
      />
    </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  // Modern Image Section Styles
  modernImageSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  modernImageContainer: {
    width: width - 40,
    height: width * 0.75,
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modernProductImage: {
    width: '100%',
    height: '100%',
  },
  modernImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernStatusBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  modernStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernImageCounter: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modernImageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernThumbnailSection: {
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  modernThumbnailContainer: {
    paddingHorizontal: 8,
    gap: 12,
  },
  modernThumbnailWrapper: {
    width: 70,
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  modernSelectedThumbnail: {
    borderColor: '#007E2F',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 126, 47, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    zIndex: 999,
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activeDot: {
    backgroundColor: '#007E2F',
    width: 20,
    borderRadius: 4,
  },

  // Modern Product Card Styles
  modernProductCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 120,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modernProductHeaderSection: {
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  modernProductName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernGradeTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modernGradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#007E2F',
    gap: 6,
  },
  modernGradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  modernTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernPriceSection: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  priceWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInfo: {
    flex: 1,
  },
  modernPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernEngagementContainer: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  engagementStatsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modernEngagementStat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  engagementIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  engagementTextContainer: {
    alignItems: 'center',
  },
  modernEngagementNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  engagementLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statsDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E8F5E8',
    marginHorizontal: 12,
    borderRadius: 0.5,
  },
  modernWishlistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    gap: 6,
    alignSelf: 'center',
  },
  modernWishlistText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Enhanced Product Details Section
  modernDetailSection: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  modernSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernDetailsGrid: {
    gap: 16,
  },
  modernDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  fullWidthCard: {
    width: '100%',
  },
  modernDetailIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  modernDetailContent: {
    flex: 1,
  },
  modernDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernDetailValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernDivider: {
    height: 2,
    backgroundColor: '#F0F0F0',
    marginVertical: 24,
    marginHorizontal: 24,
    borderRadius: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  favoriteButtonActive: {
    backgroundColor: '#FFE8E8',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  content: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  imageSection: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
  },
  imageContainer: {
    width: width * 0.85,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007E2F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // "3 days ago" badge
  ButtonOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  postedDateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100, // Extra padding for swipe to request button
    marginTop: -20,
  },
  // New product header with name, category, price, and favorite button
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  productTitleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  categoryText: {
    fontSize: 16,
    color: '#505050',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  priceAndFavoriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Farmer section styles
  farmerSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Ratings container
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 14,
    color: '#505050',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  listingInfoContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  listingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingInfoText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 16,
  },
  engagementStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 13,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  engagementTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  wishlistBadge: {
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  wishlistBadgeText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 16,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#505050',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sizesSection: {
    marginBottom: 20,
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F6F6F6',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  selectedSizeButton: {
    backgroundColor: '#007E2F',
    borderColor: '#007E2F',
  },
  sizeText: {
    fontSize: 14,
    color: '#505050',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  selectedSizeText: {
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationSection: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#505050',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 15,
    color: '#505050',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  // Modern Swipe to request styles
  modernSwipeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modernSwipeTrack: {
    height: 64,
    backgroundColor: '#E8F5E8',
    borderRadius: 32,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007E2F',
    overflow: 'hidden',
  },
  modernSwipeThumb: {
    position: 'absolute',
    left: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007E2F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernSwipeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  swipeGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modernSwipeInstruction: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Swipe to request container (original - keep for fallback)
  swipeToRequestContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  swipeTrack: {
    height: 60,
    backgroundColor: '#E8F5E8',
    borderRadius: 30,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007E2F',
  },
  swipeThumb: {
    position: 'absolute',
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007E2F',
    justifyContent: 'center',
    alignItems: 'center',
  }, swipeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  swipeInstructionText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Image carousel styles
  imageCounterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  thumbnailSection: {
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: 80,
  },
  thumbnailContainer: {
    gap: 12,
    paddingHorizontal: 4,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedThumbnailWrapper: {
    borderColor: '#007E2F',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },

  // Detailed fruit information styles
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#505050',
    marginLeft: 8,
    minWidth: 100,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Quantity info section styles
  quantityInfoSection: {
    marginBottom: 20,
  },
  quantityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  quantityDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Quantity selection styles
  quantityInfoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#505050',
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007E2F',
    marginLeft: 'auto',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  customQuantitySection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E8',
  },
  customQuantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  quantityInputText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    minWidth: 80,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Modern Farmer Section Styles
  modernFarmerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  farmerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
  farmerLoadingInfo: {
    flex: 1,
    gap: 8,
  },
  loadingTextLine: {
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    width: '80%',
  },
  loadingTextLineShort: {
    height: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 7,
    width: '60%',
  },
  loadingTextLineTiny: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    width: '40%',
  },
  modernFarmerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modernFarmerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007E2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  farmerProfileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  modernFarmerAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -2,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  modernFarmerInfo: {
    flex: 1,
  },
  modernFarmerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  farmerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modernStarsContainer: {
    flexDirection: 'row',
  },
  modernRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  reviewCountText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  farmerStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  farmerDescriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  farmerDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernReviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  reviewsCountBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernReviewsList: {
    gap: 12,
  },
  modernReviewItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007E2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  reviewRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  reviewComment: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewMoreReviewsButton: {
    backgroundColor: '#E8F5E8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#007E2F',
  },
  viewMoreReviewsText: {
    fontSize: 13,
    color: '#007E2F',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Missing styles - Price and Info
  priceLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Quantity section styles
  quantityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quantityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityDetails: {
    flex: 1,
  },
  quantitySubtext: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Location section styles
  modernLocationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationSecondary: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationTertiary: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationPrivacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  privacyText: {
    fontSize: 11,
    color: '#666666',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Availability section styles
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  availabilityTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  availabilityLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  availabilityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Timestamp section styles
  timestampCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timestampTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  timestampLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timestampValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Farmer section styles
  farmerAvatarContainer: {
    position: 'relative',
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modernReviewComment: {
    fontSize: 14,
    color: '#333333',
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernViewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F6F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  modernViewMoreText: {
    fontSize: 14,
    color: '#007E2F',
    fontWeight: '600',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modernContactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9F0',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  modernContactText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    marginLeft: 12,
    lineHeight: 20,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default ProductDetailScreen;
