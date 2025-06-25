import React, { useState, ReactElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

const { width } = Dimensions.get('window');

interface ProductCardItem {
  id?: number | string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  isFavorite?: boolean;
  farmerName?: string;
  location?: string;
  category?: string;
  image?: string;
}

interface ProductCardProps {
  product?: ProductCardItem;
  onPress?: (product: ProductCardItem) => void;
  onAddToCart?: (product: ProductCardItem) => void;
  onToggleFavorite?: (product: ProductCardItem, isFavorite: boolean) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onAddToCart, onToggleFavorite }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(product?.isFavorite || false);

  const handleFavoritePress = (): void => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.(defaultProduct, !isFavorite);
  };

  const renderStars = (rating: number): ReactElement[] => {
    const stars: ReactElement[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={12}
          color="#FF9800"
          style={styles.star}
        />
      );
    }
    return stars;
  };
  const defaultProduct: ProductCardItem = {
    name: 'Mango Oranges',
    description: 'Sweet and juicy',
    price: 28.75,
    rating: 5.0,
    reviewCount: 43,
    ...product
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress?.(defaultProduct)}>
      {/* Product Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
        >
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={16} 
            color={isFavorite ? '#FF4444' : '#FFFFFF'} 
          />
        </TouchableOpacity>
        
        {/* Orange slice placeholder */}
        <View style={styles.orangeSlice}>
          <Ionicons name="nutrition" size={60} color="#FFA726" />
        </View>
      </View>

      {/* Product Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.productName}>{defaultProduct.name}</Text>
        <Text style={styles.productDescription}>{defaultProduct.description}</Text>
        
        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${defaultProduct.price}</Text>
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={() => onAddToCart?.(defaultProduct)}
            >
              <Ionicons name="bag" size={14} color="#FF9800" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={16} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart" size={16} color="#FF9800" />
          </TouchableOpacity>
        </View>

        {/* Rating and Reviews */}
        <View style={styles.ratingSection}>
          <Text style={styles.productTitle}>{defaultProduct.name}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(defaultProduct.rating)}
            </View>
            <Text style={styles.ratingText}>
              {defaultProduct.rating} ({defaultProduct.reviewCount} reviews)
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={3}>
          Title... Mangoes have bright colors and tender flesh. Light flavors of sweet and sour. They are a treasure chest of tropical fruits. The enduri ones are very easy and crisp, they taste so good.
        </Text>

        {/* Add to Cart Button */}
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => onAddToCart?.(defaultProduct)}
        >
          <Text style={styles.addToCartText}>Add to cart</Text>
        </TouchableOpacity>

        {/* Final Price */}
        <Text style={styles.finalPrice}>${defaultProduct.price}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
  imageSection: {
    height: 200,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  orangeSlice: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 20,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 16,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingSection: {
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 1,
  },
  ratingText: {
    fontSize: 12,
    color: '#666666',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: '#666666',
    marginBottom: 20,
  },
  addToCartButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
});

export default ProductCard;
