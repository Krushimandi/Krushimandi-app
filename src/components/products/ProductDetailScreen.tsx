import React, { useState, ReactElement } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

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
}

interface ProductDetailScreenProps {
  navigation: {
    goBack: () => void;
  };
  route?: {
    params?: {
      product?: Product;
    };
  };
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const [selectedSize, setSelectedSize] = useState<string>('1 kg');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  
  // Sample product data - can be passed via route params
  const product: Product = route?.params?.product || {
    name: 'Mango Oranges',
    description: 'Sweet and juicy',
    price: 28.75,
    rating: 5.0,
    reviewCount: 43,
    sizes: ['1 kg', '600 gm', '1.2 kg'],
    freshness: 'Fresh',
    details: 'Title... Mangoes have bright colors and tender flesh. Light flavors of sweet and sour. They are a treasure chest of tropical fruits. The big ones are as big as sweet potatoes, the enduri ones are very easy and crisp, they taste so good.',
    image: null, // Will use icon instead
  };
  const renderStars = (rating: number): ReactElement[] => {
    const stars: ReactElement[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#FF9800"
          style={styles.star}
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FF9800" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {/* Orange slice icon/placeholder */}
            <View style={styles.orangeSlice}>
              <Ionicons name="nutrition" size={120} color="#FFA726" />
            </View>
          </View>
        </View>

        {/* Product Info Card */}
        <View style={styles.productCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSubtitle}>{product.description}</Text>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${product.price}</Text>
              <TouchableOpacity style={styles.cartIcon}>
                <Ionicons name="bag-outline" size={20} color="#FF9800" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="heart-outline" size={20} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="heart" size={20} color="#FF9800" />
            </TouchableOpacity>
          </View>

          {/* Freshness and Sizes */}
          <View style={styles.detailsSection}>
            <View style={styles.freshnessRow}>
              <Text style={styles.freshnessLabel}>{product.freshness}</Text>
            </View>
            
            <View style={styles.sizesRow}>
              <Text style={styles.sizesLabel}>Sizes</Text>
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
          </View>

          {/* Product Title and Rating */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(product.rating)}
              </View>
              <Text style={styles.ratingText}>
                {product.rating} ({product.reviewCount} reviews)
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{product.details}</Text>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity style={styles.addToCartButton}>
            <Text style={styles.addToCartText}>Add to cart</Text>
          </TouchableOpacity>

          {/* Final Price */}
          <Text style={styles.finalPrice}>${product.price}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  imageContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  orangeSlice: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: 20,
  },
  cardHeader: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  priceSection: {
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsSection: {
    marginBottom: 24,
  },
  freshnessRow: {
    marginBottom: 16,
  },
  freshnessLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sizesRow: {
    gap: 8,
  },
  sizesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sizesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedSizeButton: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  sizeText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  selectedSizeText: {
    color: '#FFFFFF',
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
  addToCartButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
});

export default ProductDetailScreen;
