import React, { useState, ReactElement, useRef, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants';
import { ProductStackParamList } from '../../types';

const { width, height } = Dimensions.get('window');

interface Product {
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  sizes: string[];
  freshness: string;
  details: string;
  image?: any;
  postedDate?: string;
}

type ProductDetailScreenProps = {
  navigation: StackNavigationProp<ProductStackParamList, 'ProductDetail'>;
  route: RouteProp<ProductStackParamList, 'ProductDetail'>;
};

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const [selectedSize, setSelectedSize] = useState<string>('1 kg');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Animation values for the swipe-to-request button
  const pan = useRef(new Animated.Value(0)).current;
  const swipeThreshold = width * 0.3; // 30% of screen width

  // Product data from route params
  const product: Product = route?.params?.product || {
    name: 'Hapus Mango',
    description: 'Category: mango',
    price: 50,
    rating: 4.8,
    reviewCount: 42,
    sizes: ['1 kg', '500 gm', '2 kg'],
    freshness: 'Fresh',
    details: 'Hapus Mango from Ratnagiri, Maharashtra. Available quantity: 10–12 Tons',
    image: null, // Will use icon instead
    postedDate: '3 days ago'
  };

  // PanResponder for swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Only allow movement to the right (positive x direction)
        if (gesture.dx > 0) {
          // Limit max swipe distance to 70% of container width
          const maxDistance = width * 0.85 - 60;
          const dx = Math.min(gesture.dx, maxDistance);
          pan.setValue(dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // If swiped far enough, trigger the request action
        if (gesture.dx >= swipeThreshold) {
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
    })
  ).current;

  // Function to handle the product request
  const handleRequestProduct = () => {
    Alert.alert(
      "Request Sent!",
      `Your request for ${selectedSize} of ${product.name} has been sent to the seller.`,
      [{ text: "OK" }]
    );
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
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent={true}
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
        <View style={{ width: 40 }} />  {/* Empty view for alignment */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image Section with X Button Overlay and Posted Date Badge */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {product.image ? (
              <Image
                source={product.image}
                style={styles.productImage}
                resizeMode="stretch"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="leaf" size={80} color="#007E2F" />
              </View>
            )}

            {/* Posted Date Badge */}
            {/* <TouchableOpacity
              style={styles.ButtonOverlay}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.postedDateText}>3 Days ago</Text>
            </TouchableOpacity> */}

            {product.postedDate && (
              <View style={styles.ButtonOverlay}>
                <Text style={styles.postedDateText}>{product.postedDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Info Section */}
        <View style={styles.productCard}>
          {/* Product Name, Category, Price and Favorite Row */}
          <View style={styles.productHeaderRow}>
            <View style={styles.productTitleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.categoryText}>
                {product.description.replace('Category: ', '')}
              </Text>
            </View>
            <View style={styles.priceAndFavoriteContainer}>
              <Text style={styles.price}>₹{product.price}/KG</Text>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? "#FF3B30" : "#666666"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rating and Review Count Row */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(product.rating)}
            </View>
            <Text style={styles.reviewCount}>
              {product.rating} ({product.reviewCount} reviews)
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Product Description Section */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.details}</Text>
          </View>

          <View style={styles.divider} />

          {/* Size Selection */}
          <View style={styles.sizesSection}>
            <Text style={styles.sectionTitle}>Size Options</Text>
            <View style={styles.sizesContainer}>
              {product.sizes.map((size, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sizeButton,
                    selectedSize === size && styles.selectedSizeButton
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text style={[
                    styles.sizeText,
                    selectedSize === size && styles.selectedSizeText
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Location and Availability */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Location & Availability</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color="#007E2F" />
              <Text style={styles.locationText}>{product.details.split('. Available quantity:')[0].split('from ')[1]}</Text>
            </View>
            <View style={styles.availabilityRow}>
              <Ionicons name="cube-outline" size={18} color="#007E2F" />
              <Text style={styles.availabilityText}>
                Available: {product.details.split('Available quantity: ')[1]}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* Bottom "Swipe to Request" Action */}
      <View style={styles.swipeToRequestContainer}>
        <View style={styles.swipeTrack}>
          <Animated.View
            style={[
              styles.swipeThumb,
              { transform: [{ translateX: pan }] }
            ]}
            {...panResponder.panHandlers}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.swipeText}>Swipe to request</Text>
        </View>
        <Text style={styles.swipeInstructionText}>Swipe right to send a request to the seller</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007E2F',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
  // Swipe to request container (fixed at bottom)
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
  }
});

export default ProductDetailScreen;
