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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls.ts';

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
  
  // Filter orders based on selected status
  const filteredOrders = activeFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeFilter);
  
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
  const renderOrderItem = ({ item }) => {
    const statusInfo = getStatusBadge(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.orderItem}
        activeOpacity={0.9}
        onPress={() => viewOrderDetails(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
            <Icon name={statusInfo.icon} size={12} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderContent}>
          <Image source={item.image} style={styles.productImage} />
          
          <View style={styles.orderDetails}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.sellerName}>by {item.seller}</Text>
            
            <View style={styles.orderMeta}>
              <Text style={styles.quantity}>Qty: {item.quantity}</Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
            
            <Text style={styles.dateText}>
              {item.status === 'delivered'
                ? `Delivered on ${item.dateDelivered}`
                : item.status === 'canceled'
                ? `Canceled on ${item.dateOrdered}`
                : `Ordered on ${item.dateOrdered}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => viewOrderDetails(item)}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {item.status === 'delivered' && (
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="rate-review" size={18} color={Colors.light.primary} />
              <Text style={styles.iconButtonText}>Review</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'processing' && (
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="location-outline" size={18} color={Colors.light.primary} />
              <Text style={styles.iconButtonText}>Track</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Filter buttons for order status
  const FilterButton = ({ title, value }) => (
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
    </TouchableOpacity>
  );
  
  // Empty state when no orders match filter
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="basket-outline" size={70} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'all'
          ? "You haven't placed any orders yet"
          : `You don't have any ${activeFilter} orders`}
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
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
        {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersScrollContent}>
          <FilterButton title="All Orders" value="all" />
          <FilterButton title="Processing" value="processing" />
          <FilterButton title="Delivered" value="delivered" />
          <FilterButton title="Canceled" value="canceled" />
        </View>
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
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 120, // Extra space for bottom tab bar
  },
  orderItem: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderContent: {
    flexDirection: 'row',
    padding: 16,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  orderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 12,
    color: '#757575',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  dateText: {
    fontSize: 11,
    color: '#757575',
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  viewButton: {
    backgroundColor: '#F0F0F0',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  iconButtonText: {
    fontSize: 12,
    color: Colors.light.primary,
    marginLeft: 4,
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

export default MyOrdersScreen;
