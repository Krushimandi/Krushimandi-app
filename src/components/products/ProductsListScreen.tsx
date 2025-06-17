import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { ProductCard } from './';
import { Colors } from '../../constants';

interface ProductCardItem {
  id?: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  isFavorite?: boolean;
}

interface ProductsListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

const ProductsListScreen: React.FC<ProductsListScreenProps> = ({ navigation }) => {
  const sampleProducts: ProductCardItem[] = [
    {
      id: 1,
      name: 'Mango Oranges',
      description: 'Sweet and juicy',
      price: 28.75,
      rating: 5.0,
      reviewCount: 43,
      isFavorite: false,
    },
    {
      id: 2,
      name: 'Fresh Apples',
      description: 'Crispy and fresh',
      price: 24.50,
      rating: 4.5,
      reviewCount: 32,
      isFavorite: true,
    },
    {
      id: 3,
      name: 'Sweet Bananas',
      description: 'Naturally sweet',
      price: 15.25,
      rating: 4.8,
      reviewCount: 56,
      isFavorite: false,
    },
  ];

  const handleProductPress = (product: ProductCardItem): void => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleAddToCart = (product: ProductCardItem): void => {
    console.log('Adding to cart:', product.name);
    // Implement add to cart logic here
  };

  const handleToggleFavorite = (product: ProductCardItem, isFavorite: boolean): void => {
    console.log('Toggle favorite:', product.name, isFavorite);
    // Implement favorite toggle logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fresh Fruits</Text>
        <Text style={styles.headerSubtitle}>Choose your favorite fruits</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sampleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={handleProductPress}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
});

export default ProductsListScreen;
