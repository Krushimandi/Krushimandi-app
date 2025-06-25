/**
 * WatchlistScreen Component
 * Shows saved/favorited products for buyers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Layout } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls.ts';

// Mocked watchlist data for the UI
const WATCHLIST_DATA = [
  {
    id: 'w1',
    name: 'Premium Hapus Mango',
    category: 'Mango',
    price: '₹120/KG',
    location: 'Ratnagiri, MH',
    image: require('../../assets/hapus.jpeg'),
    seller: 'Kishor Patil',
    dateAdded: '2025-06-20',
    isAvailable: true,
  },
  {
    id: 'w2',
    name: 'Kashmiri Apple',
    category: 'Apple',
    price: '₹180/KG',
    location: 'Alshpur, Jammu',
    image: require('../../assets/appleFruit.jpeg'),
    seller: 'Ramesh Kumar',
    dateAdded: '2025-06-18',
    isAvailable: true,
  },
  {
    id: 'w3',
    name: 'Organic Spinach',
    category: 'Vegetable',
    price: '₹40/KG',
    location: 'Pune, MH',
    image: require('../../assets/spinach.jpg'),
    seller: 'Anita Patil',
    dateAdded: '2025-06-15',
    isAvailable: false,
  },
];

const WatchlistScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Show tab bar when screen is focused
  useEffect(() => {
    showTabBar();
  }, []);

  // Load watchlist data
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        // In a real app, this would fetch from an API or local storage
        setLoading(true);
        
        // Simulate network request
        setTimeout(() => {
          setWatchlist(WATCHLIST_DATA);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading watchlist:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load your watchlist items');
      }
    };
    
    loadWatchlist();
  }, []);
  
  // Remove item from watchlist
  const removeFromWatchlist = (id) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setWatchlist(watchlist.filter(item => item.id !== id));
          }
        }
      ]
    );
  };
  
  // Navigate to product details
  const viewProductDetails = (item) => {
    navigation.navigate('ProductFlow', {
      screen: 'ProductDetail',
      params: {
        product: {
          id: item.id,
          name: item.name,
          description: `Category: ${item.category}`,
          price: parseFloat(item.price.replace('₹', '').replace('/KG', '')),
          image: item.image,
          location: item.location,
          seller: item.seller
        }
      }
    });
  };

  // Render individual watchlist item
  const renderWatchlistItem = ({ item }) => (
    <View style={styles.watchlistItem}>
      <TouchableOpacity 
        style={styles.itemContainer}
        activeOpacity={0.8} 
        onPress={() => viewProductDetails(item)}
      >
        <Image source={item.image} style={styles.productImage} />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.sellerName}>by {item.seller}</Text>
          
          <View style={styles.locationContainer}>
            <Icon name="location-outline" size={12} color="#757575" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
          
          <Text style={styles.priceText}>{item.price}</Text>
          {!item.isAvailable && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableText}>Currently Unavailable</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => removeFromWatchlist(item.id)}
        >
          <Icon name="heart-dislike-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.orderButton]}
          disabled={!item.isAvailable}
          onPress={() => viewProductDetails(item)}
        >
          <Text style={styles.orderButtonText}>
            {item.isAvailable ? 'Order' : 'Unavailable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Empty watchlist state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="heart-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
      <Text style={styles.emptyText}>
        Save items you're interested in by tapping the heart icon on products
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Browse')}
      >
        <Text style={styles.browseButtonText}>Browse Products</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
        
        <View style={styles.headerRightContainer}>
          {watchlist.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={() => {
                Alert.alert(
                  'Clear Watchlist',
                  'Are you sure you want to clear your entire watchlist?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Clear All', 
                      style: 'destructive',
                      onPress: () => setWatchlist([])
                    }
                  ]
                );
              }}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your watchlist...</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          renderItem={renderWatchlistItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearAllText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 120, // Extra space for bottom tab bar
  },
  watchlistItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  unavailableBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#FFE0E0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  unavailableText: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
  },
  actionButton: {
    padding: 8,
    marginRight: 12,
  },
  orderButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 'auto',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
  }
});

export default WatchlistScreen;
