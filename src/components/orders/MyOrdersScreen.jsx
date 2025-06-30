/**
 * MyOrdersScreen Component
 * Shows orders placed by buyers
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
  ActivityIndicator,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls.ts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mock order data for UI
const ORDERS_DATA = [
  {
    id: 'o1',
    productName: 'Premium Hapus Mango',
    orderNumber: 'KM20250621',
    quantity: '5 KG',
    price: '₹600',
    image: require('../../assets/hapus.jpeg'),
    status: 'delivered',
    seller: 'Kishor Patil',
    dateOrdered: '21 June 2025',
    dateDelivered: '24 June 2025',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'Cash on Delivery'
  },
  {
    id: 'o2',
    productName: 'Kashmiri Apple',
    orderNumber: 'KM20250620',
    quantity: '3 KG',
    price: '₹540',
    image: require('../../assets/appleFruit.jpeg'),
    status: 'processing',
    seller: 'Ramesh Kumar',
    dateOrdered: '20 June 2025',
    estimatedDelivery: '23 June 2025',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'UPI'
  },
  {
    id: 'o3',
    productName: 'Organic Spinach',
    orderNumber: 'KM20250618',
    quantity: '2 KG',
    price: '₹80',
    image: require('../../assets/spinach.jpg'),
    status: 'canceled',
    seller: 'Anita Patil',
    dateOrdered: '18 June 2025',
    cancellationReason: 'Stock unavailable',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'UPI'
  }
];


const MyOrdersScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Show tab bar when screen is focused
  useEffect(() => {
    showTabBar();
  }, []);

  // Load orders data
  useEffect(() => {
    const loadOrders = async () => {
      try {
        // In a real app, this would fetch from an API
        setLoading(true);

        // Simulate network request
        setTimeout(() => {
          setOrders(ORDERS_DATA);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading orders:', error);
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate network request
    setTimeout(() => {
      setOrders(ORDERS_DATA);
      setRefreshing(false);
    }, 1500);
  };

  // Get order statistics
  const getOrderStats = () => {
    return {
      total: orders.length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      processing: orders.filter(o => o.status === 'processing').length,
      canceled: orders.filter(o => o.status === 'canceled').length,
    };
  };

  // Filter orders based on selected status
  const filteredOrders = activeFilter === 'all'
    ? orders.filter(order =>
      order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.seller.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : orders.filter(order =>
      order.status === activeFilter &&
      (order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.seller.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // View order details
  const viewOrderDetails = (order) => {
    // In a real app, navigate to order details screen
    alert(`View details for order ${order.orderNumber}`);
    // Example navigation:
    // navigation.navigate('OrderDetail', { orderId: order.id });
  };

  // Status badge based on order status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return { color: '#4CAF50', text: 'Delivered', icon: 'checkmark-circle' };
      case 'processing':
        return { color: '#2196F3', text: 'Processing', icon: 'time' };
      case 'canceled':
        return { color: '#F44336', text: 'Canceled', icon: 'close-circle' };
      default:
        return { color: '#9E9E9E', text: 'Unknown', icon: 'help-circle' };
    }
  };

  // Render individual order item
  const renderOrderItem = ({ item, index }) => {
    const statusInfo = getStatusBadge(item.status);

    return (
      <View style={styles.orderItem}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => viewOrderDetails(item)}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.orderDate}>{item.dateOrdered}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
              <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
          </View>

          <View style={styles.orderContent}>
            <View style={styles.productImageContainer}>
              <Image source={item.image} style={styles.productImage} />
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{item.quantity}</Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
              <View style={styles.sellerRow}>
                <Icon name="storefront-outline" size={14} color="#757575" />
                <Text style={styles.sellerName}>{item.seller}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{item.price}</Text>
                {item.status === 'delivered' && (
                  <View style={styles.ratingContainer}>
                    <FontAwesome5 name="star" size={12} color="#FFD700" solid />
                    <Text style={styles.ratingText}>4.5</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => viewOrderDetails(item)}
              >
                <Icon name="eye-outline" size={18} color={Colors.light.primary} />
              </TouchableOpacity>

              {item.status === 'delivered' && (
                <TouchableOpacity style={styles.quickActionButton}>
                  <MaterialIcons name="rate-review" size={18} color={Colors.light.primary} />
                </TouchableOpacity>
              )}

              {item.status === 'processing' && (
                <TouchableOpacity style={styles.quickActionButton}>
                  <Icon name="location-outline" size={18} color={Colors.light.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Progress indicator for processing orders */}
          {item.status === 'processing' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '60%' }]} />
              </View>
              <Text style={styles.progressText}>Order is being prepared</Text>
            </View>
          )}

          {/* Cancellation reason for canceled orders */}
          {item.status === 'canceled' && item.cancellationReason && (
            <View style={styles.cancellationContainer}>
              <Icon name="information-circle-outline" size={16} color="#F44336" />
              <Text style={styles.cancellationText}>{item.cancellationReason}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Filter buttons for order status
  const FilterButton = ({ title, value, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === value && styles.activeFilterButton
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        activeFilter === value && styles.activeFilterText
      ]}>
        {title}
      </Text>
      {count > 0 && (
        <View style={[
          styles.filterBadge,
          activeFilter === value && styles.activeFilterBadge
        ]}>
          <Text style={[
            styles.filterBadgeText,
            activeFilter === value && styles.activeFilterBadgeText
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Empty state when no orders match filter
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="basket-outline" size={80} color="#E0E0E0" />
        <View style={styles.emptyIconOverlay}>
          <Icon name="search-outline" size={30} color="#BDBDBD" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching orders' : 'No orders found'}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? `No orders match "${searchQuery}"`
          : activeFilter === 'all'
            ? "You haven't placed any orders yet"
            : `You don't have any ${activeFilter} orders`}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Browse')}
        >
          <Icon name="storefront-outline" size={18} color="#FFFFFF" />
          <Text style={styles.browseButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const orderStats = getOrderStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent={true}
        barStyle="dark-content"
      />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSubtitle}>{orderStats.total} orders placed</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('Opening notifications from header');
              navigation.navigate('Notification'); // Navigate to Notification screen
            }}
            style={styles.notificationButton}>
            <Icon name="notifications-outline" size={24} color="#000000" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Icon name="close-circle" size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Enhanced Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <FilterButton title="All" value="all" count={orderStats.total} />
          <FilterButton title="Processing" value="processing" count={orderStats.processing} />
          <FilterButton title="Delivered" value="delivered" count={orderStats.delivered} />
          <FilterButton title="Canceled" value="canceled" count={orderStats.canceled} />
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersScrollContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F6F6F6',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: Colors.light.primaryDark,
    borderColor: Colors.light.primaryDark,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#757575',
  },
  activeFilterBadgeText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  orderItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  orderDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  orderContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  quantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderDetails: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 4,
  },
  orderActions: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 16,
  },
  quickActionButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  cancellationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFEBEE',
  },
  cancellationText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  emptyIconOverlay: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
});

export default MyOrdersScreen;
