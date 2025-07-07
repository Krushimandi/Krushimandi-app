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
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls.ts';
import NotificationBadge from '../common/NotificationBadge.tsx';

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
    farmerPhone: '+91 9876543210',
    farmerLocation: 'Ratnagiri, Maharashtra',
    dateOrdered: '21 June 2025',
    dateDelivered: '24 June 2025',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'Cash on Delivery',
    category: 'Fruits',
    fruitInfo: {
      variety: 'Alphonso',
      quality: 'Premium Grade A',
      origin: 'Ratnagiri Farms',
      harvestDate: '18 June 2025'
    }
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
    farmerPhone: '+91 9876543211',
    farmerLocation: 'Srinagar, Kashmir',
    dateOrdered: '20 June 2025',
    estimatedDelivery: '23 June 2025',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'UPI',
    unreadMessages: 2,
    category: 'Fruits',
    fruitInfo: {
      variety: 'Red Delicious',
      quality: 'Export Quality',
      origin: 'Kashmir Valley',
      harvestDate: '19 June 2025'
    }
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
    farmerPhone: '+91 9876543212',
    farmerLocation: 'Nashik, Maharashtra',
    dateOrdered: '18 June 2025',
    cancellationReason: 'Stock unavailable - Heavy rains affected harvest',
    deliveryAddress: 'Flat 301, Sunrise Apartments, Kothrud, Pune - 411038',
    paymentMethod: 'UPI',
    category: 'Vegetables',
    fruitInfo: {
      variety: 'Baby Spinach',
      quality: 'Organic Certified',
      origin: 'Organic Farm',
      harvestDate: '17 June 2025'
    }
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

  // Handle viewing inquiries/order details
  const handleViewInquiries = (order) => {
    // Navigate to order detail screen with inquiry focus
    alert(`📧 Viewing details and messages for order ${order.orderNumber}\n\nThis would show:\n• Order timeline\n• Messages with seller\n• Delivery updates\n• Payment details`);
    // navigation.navigate('OrderDetail', { orderId: order.id, tab: 'messages' });
  };

  // Handle contacting seller
  const handleContactSeller = (order) => {
    alert(`💬 Contact ${order.seller}\n\nThis would open a chat or message composer to communicate with the seller about your order.`);
    // navigation.navigate('Chat', { sellerId: order.sellerId, orderId: order.id });
  };

  // Handle writing review
  const handleWriteReview = (order) => {
    alert(`⭐ Write Review for ${order.productName}\n\nThis would open a review form where you can:\n• Rate the product (1-5 stars)\n• Write detailed feedback\n• Upload photos\n• Rate seller service`);
    // navigation.navigate('WriteReview', { orderId: order.id });
  };

  // Handle reorder
  const handleReorder = (order) => {
    alert(`🔄 Reorder ${order.productName}\n\nThis would:\n• Add the item to your cart\n• Navigate to checkout\n• Pre-fill delivery details\n• Show current price`);
    // navigation.navigate('ProductDetail', { productId: order.productId, action: 'reorder' });
  };

  // Handle contact support
  const handleContactSupport = (order) => {
    alert(`🎧 Contact Support\n\nOrder: ${order.orderNumber}\n\nThis would open support chat or help center for assistance with your canceled order.`);
    // navigation.navigate('Support', { orderId: order.id, issue: 'cancellation' });
  };

  // Handle find similar products
  const handleFindSimilar = (order) => {
    alert(`🔍 Find Similar to ${order.productName}\n\nThis would show:\n• Similar products from other sellers\n• Same category items\n• Recommended alternatives\n• Price comparisons`);
    // navigation.navigate('Browse', { category: order.category, search: order.productName });
  };

  // Handle direct call to farmer
  const handleCallFarmer = (order) => {
    Alert.alert(
      'Call Farmer',
      `Would you like to call ${order.seller}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${order.farmerPhone}`;
            Linking.canOpenURL(phoneUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Error', 'Phone calls are not supported on this device');
                }
              })
              .catch((err) => {
                console.error('Error opening phone dialer:', err);
                Alert.alert('Error', 'Unable to make phone call');
              });
          },
        },
      ]
    );
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
      <View style={styles.orderCard}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <Text style={styles.productTitle}>{item.productName}</Text>
          <View style={styles.dateRow}>
            <Icon name="calendar-outline" size={16} color="#8B5CF6" />
            <Text style={styles.harvestDate}>{item.fruitInfo.harvestDate}</Text>
          </View>
        </View>

        {/* Main Content Row */}
        <View style={styles.mainContent}>
          {/* Product Image with Quantity Badge */}
          <View style={styles.imageContainer}>
            <Image source={item.image} style={styles.productImage} />
          </View>

          {/* Farmer Details */}
          <View style={styles.farmerDetails}>
            <Text style={styles.farmerName}>{item.seller}</Text>

            <View style={styles.varietyRow}>
              <Icon name="leaf-outline" size={14} color="#10B981" />
              <Text style={styles.varietyText}>{item.fruitInfo.variety}</Text>
            </View>

            <View style={styles.locationRow}>
              <Icon name="location-outline" size={16} color="#EF4444" />
              <Text style={styles.locationText}>{item.farmerLocation}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons - Only Call and Message */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallFarmer(item)}
          >
            <Icon name="call" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => handleContactSeller(item)}
          >
            <Icon name="chatbubble-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Message</Text>
            {item.unreadMessages > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>{item.unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
            <Text style={styles.headerSubtitle}>{orderStats.total} orders • {orderStats.processing} active</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('Opening notifications from header');
              navigation.navigate('Notification'); // Navigate to Notification screen
            }}
            style={styles.notificationButton}>
            <Icon name="notifications-outline" size={24} color="#000000" />
            <View style={styles.notificationBadge}>
              <NotificationBadge size="small" count={3}  borderWidth={0}/>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  notificationButton: {
    position: 'relative',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filtersScrollContent: {
    paddingHorizontal: 24,
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  activeFilterButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  activeFilterBadgeText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingVertical: 16,
    paddingBottom: 120,
  },

  // New Modern Order Card Styles
  orderItem: {
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },

  // Refined Card Header
  cardHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  harvestDate: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.1,
  },

  // Refined Main Content Section
  mainContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  quantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Refined Farmer Details Section
  farmerDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  varietyText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 5,
    letterSpacing: -0.1,
  },

  // Refined Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },

  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  messageButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  messageBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // Info Section
  infoSection: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },

  // Location Section
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },

  // Progress Section
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressDescription: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Action Section
  actionSection: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  primaryActionButton: {
    backgroundColor: Colors.light.primary,
  },
  secondaryActionButton: {
    backgroundColor: '#10B981',
  },
  reviewActionButton: {
    backgroundColor: '#F59E0B',
  },
  reorderActionButton: {
    backgroundColor: '#8B5CF6',
  },
  supportActionButton: {
    backgroundColor: '#6B7280',
  },
  findSimilarActionButton: {
    backgroundColor: '#3B82F6',
  },
  messageBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Cancellation Info
  cancellationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  cancellationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  cancellationReason: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },

  orderHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modernOrderContent: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
  },
  modernProductImageContainer: {
    position: 'relative',
  },
  modernProductImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
  },
  modernQuantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modernOrderDetails: {
    flex: 1,
    marginLeft: 20,
  },
  modernProductName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 24,
  },
  modernSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primaryLight || '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sellerInfoContainer: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
  },
  callButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  callButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  modernPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  modernRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },
  modernProgressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  modernProgressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 12,
  },
  modernProgressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  modernProgressText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modernBottomActions: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modernActionRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  modernActionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modernActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernActionText: {
    marginLeft: 16,
    flex: 1,
  },
  modernActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modernActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  emptyIconOverlay: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '500',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 20,
    fontWeight: '500',
  },

  // Enhanced Cancellation styles
  cancellationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 24,
    borderRadius: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancellationTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  cancellationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cancellationReason: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default MyOrdersScreen;
