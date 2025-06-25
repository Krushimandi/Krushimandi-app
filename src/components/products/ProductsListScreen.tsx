import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ProductCard } from './';
import { Colors } from '../../constants';
import { getCompleteUserProfile } from '../../services/firebaseService';

// Use the ProductCardItem interface from ProductCard
interface Product {
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

interface ProductsListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

const ProductsListScreen: React.FC<ProductsListScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Sample products - In real app, fetch from Firebase
  const sampleProducts: Product[] = [
    {
      id: 1,
      name: 'Fresh Mangoes',
      description: 'Sweet Alphonso mangoes from Maharashtra',
      price: 28.75,
      rating: 5.0,
      reviewCount: 43,
      isFavorite: false,
      farmerName: 'Ramesh Patil',
      location: 'Ratnagiri, Maharashtra',
      category: 'Fruits',
    },
    {
      id: 2,
      name: 'Organic Apples',
      description: 'Fresh Kashmir apples, crispy and sweet',
      price: 45.50,
      rating: 4.5,
      reviewCount: 32,
      isFavorite: true,
      farmerName: 'Suresh Kumar',
      location: 'Shimla, Himachal Pradesh',
      category: 'Fruits',
    },
    {
      id: 3,
      name: 'Premium Bananas',
      description: 'Naturally ripened bananas from Kerala',
      price: 15.25,
      rating: 4.8,
      reviewCount: 56,
      isFavorite: false,
      farmerName: 'Arjun Nair',
      location: 'Kochi, Kerala',
      category: 'Fruits',
    },
    {
      id: 4,
      name: 'Fresh Tomatoes',
      description: 'Vine-ripened tomatoes, perfect for cooking',
      price: 20.00,
      rating: 4.2,
      reviewCount: 28,
      isFavorite: false,
      farmerName: 'Priya Sharma',
      location: 'Pune, Maharashtra',
      category: 'Vegetables',
    },
    {
      id: 5,
      name: 'Organic Spinach',
      description: 'Fresh green spinach, pesticide-free',
      price: 12.50,
      rating: 4.7,
      reviewCount: 19,
      isFavorite: true,
      farmerName: 'Manoj Singh',
      location: 'Delhi, India',
      category: 'Vegetables',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const profile = await getCompleteUserProfile();
      setUserProfile(profile);
      
      // In a real app, you would fetch products from Firebase based on user role
      // For now, using sample data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      setProducts(sampleProducts);
      
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProductPress = (product: Product): void => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleAddToCart = (product: Product): void => {
    console.log('Adding to cart:', product.name);
    // TODO: Implement add to cart logic with Firebase
  };

  const handleToggleFavorite = (product: Product, isFavorite: boolean): void => {
    console.log('Toggle favorite:', product.name, isFavorite);
    // TODO: Implement favorite toggle with Firebase
    
    // Update local state for immediate feedback
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === product.id ? { ...p, isFavorite } : p
      )
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userProfile?.userRole === 'farmer' ? 'My Products' : 'Fresh Products'}
        </Text>
        <TouchableOpacity onPress={() => console.log('Search pressed')}>
          <Icon name="search" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.headerSubtitle}>
          {userProfile?.userRole === 'farmer' 
            ? 'Manage your product listings' 
            : 'Choose from fresh, quality products'
          }
        </Text>
        <Text style={styles.productCount}>
          {products.length} product{products.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={handleProductPress}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
        
        {products.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="basket-outline" size={64} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              {userProfile?.userRole === 'farmer' 
                ? 'Start by adding your first product' 
                : 'Check back later for new products'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {userProfile?.userRole === 'farmer' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Icon name="add" size={24} color={Colors.light.textOnPrimary} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ProductsListScreen;
