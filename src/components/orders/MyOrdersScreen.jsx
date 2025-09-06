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
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { Colors } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls.ts';
import NotificationBadge from '../common/NotificationBadge.tsx';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

import { useRequests } from '../../hooks/useRequests';
import { useOrdersBadgeStore } from '../../store';
import { useNotifications } from '../../hooks/useNotifications';

const getDateFromTimestamp = (timestamp) => {
  let dateObj;

  if (!timestamp) dateObj = new Date();
  else if (timestamp.toDate) dateObj = timestamp.toDate(); // Firestore Timestamp
  else if (timestamp.seconds) dateObj = new Date(timestamp.seconds * 1000); // Firestore object
  else if (timestamp._seconds) dateObj = new Date(timestamp._seconds * 1000); // JSON exported object
  else dateObj = new Date(timestamp); // string ya Date handle ho jayega

  // Format: YYYY-MM-DD HH:MM AM/PM
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, '0');

  return `${year}-${month}-${day} ${hourStr}:${minutes} ${ampm}`;
};

// Normalize backend request status to only two UI statuses: "accepted" and "completed"
const toUiStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (['delivered', 'completed', 'complete'].includes(s)) return 'completed';
  if (['accepted', 'confirm', 'confirmed', 'approved'].includes(s)) return 'accepted';
  // Anything else (pending, shipped, processing, canceled, etc.) is not shown
  return null;
};

// Normalize a location that may be a string or object into a readable string
const normalizeLocation = (loc) => {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    // Common keys we care about in preferred order
    const keysPreferred = [
      'village', 'area', 'locality', 'city', 'district', 'state', 'pincode', 'postalCode', 'country'
    ];
    const parts = [];
    keysPreferred.forEach(k => {
      const v = loc[k];
      if (v && typeof v === 'string' && !parts.includes(v)) parts.push(v);
    });
    // Fallback: include lat/lng if nothing textual
    if (parts.length === 0) {
      const lat = loc.lat || loc.latitude;
      const lng = loc.lng || loc.longitude || loc.long;
      if (lat && lng) return `${lat}, ${lng}`;
    }
    if (parts.length === 0) {
      try {
        return JSON.stringify(loc);
      } catch (_) {
        return '';
      }
    }
    return parts.filter(Boolean).join(', ');
  }
  return String(loc);
};

// Helper to map requests to order data (only include accepted/completed)
const mapRequestsToOrders = (requests) => {
  return (requests || [])
    .map(r => {
      const mappedStatus = toUiStatus(r.status);
      if (!mappedStatus) return null;
      return {
        id: r.id,
        farmerId: r.farmerId, // Add farmerId for fetching farmer details
        productName: r.productSnapshot?.name || 'Unknown Product',
        orderNumber: r.id, // Firestore does not provide orderNumber, use id
        quantity: Array.isArray(r.quantity)
          ? `${r.quantity[0]}-${r.quantity[1]} ${r.quantityUnit || 'ton'}`
          : `${r.quantity} ${r.quantityUnit || 'ton'}`,
        price: r.productSnapshot?.price
          ? `₹${r.productSnapshot.price}/${r.productSnapshot.priceUnit || 'ton'}`
          : 'Price not available',
        image: r.productSnapshot?.imageUrl
          ? { uri: r.productSnapshot.imageUrl }
          : require('../../assets/fruits.png'),
        status: mappedStatus,
        seller: r.productSnapshot?.farmerName || 'Unknown Farmer',
        farmerLocation: normalizeLocation(r.productSnapshot?.farmerLocation) || 'Unknown Location',
        // Use createdAt (Firestore Timestamp) instead of createdAtString
        dateOrdered: r.createdAt ? getDateFromTimestamp(r.createdAt) : '',
        // dateOrdered: r.createdAtString ? getDateFromTimestamp(r.createdAtString)
        //   : 'Unavailable',
        deliveryAddress: normalizeLocation(r.buyerDetails?.location) || '',
        paymentMethod: r.paymentMethod || '',
        category: r.productSnapshot?.category || '',
        fruitInfo: {
          variety: r.productSnapshot?.variety || '',
          quality: r.productSnapshot?.quality || '',
          origin: r.productSnapshot?.origin || '',
          harvestDate: r.productSnapshot?.harvestDate || '',
        },
        buyerName: r.buyerDetails?.name || '',
        unreadMessages: r.unreadMessages || 0,
      };
    })
    .filter(Boolean);
};


const MyOrdersScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const { requests, loading: requestsLoading, loadBuyerRequests } = useRequests();
  const {
    notifications = [],
    unreadCount = 0,
    loading: notificationsLoading = false
  } = useNotifications() || {};
  const [orders, setOrders] = useState([]);
  const reconcileBadge = useOrdersBadgeStore(s => s.reconcileFromRequests);
  const markSeen = useOrdersBadgeStore(s => s.markSeen);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('accepted');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Show tab bar and load requests only once on mount
  useEffect(() => {
    showTabBar();
    loadBuyerRequests();
  }, []);

  // Map requests to orders whenever requests change
  useEffect(() => {
    setOrders(mapRequestsToOrders(requests));
    // Reconcile local badge state using raw requests (no remote fetch)
    reconcileBadge(requests);
    setLoading(requestsLoading);
  }, [requests, requestsLoading]);

  // Log notification status for debugging
  useEffect(() => {
    if (!notificationsLoading) {
      console.log('📨 Notifications loaded:', {
        total: notifications.length,
        unread: unreadCount,
        shouldShowBadge: unreadCount > 0
      });
    }
  }, [notifications, unreadCount, notificationsLoading]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh both orders and notifications
      await Promise.all([
        loadBuyerRequests(),
        // Refresh notifications to update unread count
        notifications.length > 0 ? Promise.resolve() : Promise.resolve()
      ]);
      setOrders(mapRequestsToOrders(requests));
      // Reconcile after refresh as well
      reconcileBadge(requests);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Get order statistics
  const getOrderStats = () => {
    return {
      total: orders.length,
      completed: orders.filter(o => o.status === 'completed').length,
      accepted: orders.filter(o => o.status === 'accepted').length,
    };
  };

  // Filter orders based on selected status
  const filteredOrders = orders.filter(order =>
    order.status === activeFilter &&
    (order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.seller.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // When user views the accepted tab, mark visible accepted requests as seen
  useEffect(() => {
    if (activeFilter !== 'accepted') return;
    // Determine which orders correspond to accepted requests (accepted bucket in UI)
    const visibleIds = filteredOrders.map(o => o.id);
    if (visibleIds.length > 0) {
      markSeen(visibleIds);
    }
  }, [activeFilter, filteredOrders, markSeen]);

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
  const handleContactSeller = async (order) => {
    try {
      // Get the farmer ID from the order
      const farmerId = order.farmerId;

      if (!farmerId) {
        Alert.alert(
          'Contact Information Missing',
          'Unable to identify the farmer for this order.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show loading while fetching farmer phone
      const loadingTimeout = setTimeout(() => {
        Alert.alert(
          'Getting Contact Info',
          'Fetching farmer contact details...',
          [],
          { cancelable: false }
        );
      }, 500);

      // Fetch farmer's actual phone number from Firestore
      const farmerPhoneNumber = await getFarmerPhoneNumber(farmerId);

      // Clear loading
      clearTimeout(loadingTimeout);

      if (!farmerPhoneNumber) {
        Alert.alert(
          'Contact Information Unavailable',
          `Sorry, we couldn't find a phone number for ${order.seller}.\n\nYou may need to contact them through other means or check back later.`
        );
        return;
      }

      // Clean the phone number (remove any non-digit characters except +)
      const cleanPhone = farmerPhoneNumber.replace(/[^\d+]/g, '');

      // Create a demo message
      const demoMessage = `Hello ${order.seller}! 👋\n\nI have a question about my order:\n• Order: ${order.orderNumber}\n• Product: ${order.productName}\n• Quantity: ${order.quantity}\n\nCould you please provide an update on the delivery status?\n\nThank you! 😊`;

      // Encode the message for URL
      const encodedMessage = encodeURIComponent(demoMessage);
      const smsUrl = `sms:${cleanPhone}?body=${encodedMessage}`;

      console.log('📱 Attempting to open SMS with:', `sms:${cleanPhone}?body=<message>`);

      // First try to open SMS directly
      Linking.openURL(smsUrl)
        .then(() => {
          console.log('✅ SMS app opened successfully');
        })
        .catch((error) => {
          console.error('❌ SMS failed, trying alternative methods:', error);

          // Fallback 1: Try without body parameter (some devices don't support it)
          const simpleSmsUrl = `sms:${cleanPhone}`;
          Linking.openURL(simpleSmsUrl)
            .then(() => {
              console.log('✅ SMS opened with simple format');
              // Show the message for user to copy
              Alert.alert(
                'Message App Opened',
                `Please copy and paste this message:\n\n${demoMessage}`,
                [
                  {
                    text: 'Copy Message',
                    onPress: () => {
                      Clipboard.setString(demoMessage);
                      Alert.alert('Message Copied!', 'The message has been copied to your clipboard.');
                    }
                  },
                  { text: 'OK' }
                ]
              );
            })
            .catch((fallbackError) => {
              console.error('❌ All SMS methods failed:', fallbackError);

              // Final fallback: Show options to user
              Alert.alert(
                'Message Seller',
                `Send a message to ${order.seller}\n\nPhone: ${farmerPhoneNumber}`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Copy Number & Message',
                    onPress: () => {
                      const fullText = `Phone: ${farmerPhoneNumber}\n\nMessage:\n${demoMessage}`;
                      Clipboard.setString(fullText);
                      Alert.alert(
                        'Copied!',
                        'Phone number and message have been copied to your clipboard.\n\nYou can now paste them in your messaging app.'
                      );
                    }
                  },
                  {
                    text: 'Try SMS Again',
                    onPress: () => {
                      // Try one more time with different format
                      Linking.openURL(`sms://${cleanPhone}`)
                        .catch(() => {
                          Alert.alert(
                            'Unable to Open Messaging',
                            `Please manually message: ${farmerPhoneNumber}\n\nOr copy the demo message from the options above.`
                          );
                        });
                    }
                  }
                ]
              );
            });
        });

    } catch (error) {
      console.error('❌ Error in handleContactSeller:', error);
      Alert.alert(
        'Connection Error',
        'Something went wrong while trying to get the farmer\'s contact information. Please check your internet connection and try again.'
      );
    }
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

  // Fetch farmer phone number from Firestore
  const getFarmerPhoneNumber = async (farmerId) => {
    try {
      console.log('🔍 Fetching farmer phone number for ID:', farmerId);

      if (!farmerId || farmerId.trim() === '') {
        console.log('⚠️ Invalid farmer ID provided');
        return null;
      }

      // Try to get from farmers collection first
      const farmerDoc = await firestore().collection('farmers').doc(farmerId).get();

      if (farmerDoc.exists()) {
        const farmerData = farmerDoc.data();
        console.log('👨‍🌾 Farmer data found:', {
          name: farmerData.displayName || farmerData.name,
          hasPhone: !!(farmerData.phoneNumber || farmerData.phone || farmerData.mobile)
        });

        // Check multiple possible phone field names
        const phoneNumber = farmerData.phoneNumber || farmerData.phone || farmerData.mobile;

        if (phoneNumber) {
          console.log('📱 Found phone number:', phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')); // Log masked phone for privacy
          return phoneNumber;
        } else {
          console.log('📵 No phone number found in farmer data');
          return null;
        }
      } else {
        console.log('⚠️ Farmer document not found for ID:', farmerId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching farmer phone number:', error);
      return null;
    }
  };

  // Handle direct call to farmer
  const handleCallFarmer = async (order) => {
    try {
      // First, try to get the farmer ID from the order
      const farmerId = order.farmerId;

      if (!farmerId) {
        Alert.alert(
          'Contact Information Missing',
          'Unable to identify the farmer for this order. Please try using the message feature instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send Message',
              onPress: () => handleContactSeller(order)
            }
          ]
        );
        return;
      }

      // Show loading indicator
      const loadingAlert = setTimeout(() => {
        Alert.alert(
          'Getting Contact Info',
          'Fetching farmer contact details...',
          [],
          { cancelable: false }
        );
      }, 500); // Show loading only if it takes more than 500ms

      // Fetch farmer's actual phone number from Firestore
      const farmerPhoneNumber = await getFarmerPhoneNumber(farmerId);

      // Clear any loading alerts
      clearTimeout(loadingAlert);

      if (!farmerPhoneNumber) {
        Alert.alert(
          'Contact Information Unavailable',
          `Sorry, we couldn't find a phone number for ${order.seller}.\n\nYou can try contacting them through the message feature instead.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send Message',
              onPress: () => handleContactSeller(order)
            }
          ]
        );
        return;
      }

      // Clean the phone number (remove any non-digit characters except +)
      const cleanPhone = farmerPhoneNumber.replace(/[^\d+]/g, '');

      if (!cleanPhone || cleanPhone.length < 10) {
        Alert.alert(
          'Invalid Phone Number',
          `The phone number for ${order.seller} appears to be invalid.\n\nPlease try contacting them through the message feature.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send Message',
              onPress: () => handleContactSeller(order)
            }
          ]
        );
        return;
      }

      const phoneUrl = `tel:${cleanPhone}`;
      console.log('📞 Attempting to call farmer via:', phoneUrl);

      // First try to open directly
      Linking.openURL(phoneUrl)
        .then(() => {
          console.log('✅ Phone call initiated successfully');
        })
        .catch((error) => {
          console.error('❌ Direct call failed, trying alternative methods:', error);

          // Fallback 1: Try with different URL format for iOS
          const alternativeUrl = `telprompt:${cleanPhone}`;
          Linking.openURL(alternativeUrl)
            .then(() => {
              console.log('✅ Phone call initiated with telprompt');
            })
            .catch((fallbackError) => {
              console.error('❌ Fallback call also failed:', fallbackError);

              // Fallback 2: Show options to user
              Alert.alert(
                'Call Farmer',
                `Contact ${order.seller}\n\nPhone: ${farmerPhoneNumber}\n\nWould you like to call this number?`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Copy Number',
                    onPress: () => {
                      Clipboard.setString(farmerPhoneNumber);
                      Alert.alert(
                        'Number Copied!',
                        `${farmerPhoneNumber} has been copied to your clipboard.\n\nYou can now paste it in your phone dialer.`
                      );
                    }
                  },
                  {
                    text: 'Call Now',
                    onPress: () => {
                      // Try one more time with basic tel: format
                      Linking.openURL(`tel:${farmerPhoneNumber}`)
                        .catch(() => {
                          Alert.alert(
                            'Unable to Make Call',
                            `Your device may not support automatic dialing.\n\nPlease manually dial: ${farmerPhoneNumber}`,
                            [
                              {
                                text: 'Copy Number',
                                onPress: () => {
                                  Clipboard.setString(farmerPhoneNumber);
                                  Alert.alert('Number Copied!', 'You can now paste it in your phone dialer.');
                                }
                              },
                              { text: 'OK' }
                            ]
                          );
                        });
                    }
                  }
                ]
              );
            });
        });

    } catch (error) {
      console.error('❌ Error in handleCallFarmer:', error);
      Alert.alert(
        'Connection Error',
        'Something went wrong while trying to get the farmer\'s contact information. Please check your internet connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Message Instead',
            onPress: () => handleContactSeller(order)
          },
          {
            text: 'Retry',
            onPress: () => handleCallFarmer(order)
          }
        ]
      );
    }
  };

  // Status badge based on order status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { color: '#4CAF50', text: 'Completed', icon: 'checkmark-circle' };
      case 'accepted':
        return { color: '#2196F3', text: 'Accepted', icon: 'time' };
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
            <Text style={styles.harvestDate}>{item.dateOrdered}</Text>
          </View>
        </View>

        {/* Main Content Row */}
        <View style={styles.mainContent}>
          {/* Product Image with Quantity Badge */}
          <View style={styles.imageContainer}>
            <Image source={item.image} style={styles.productImage} />
            {/* <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>{item.quantity}</Text>
            </View> */}
          </View>

          {/* Farmer & Buyer Details */}
          <View style={styles.farmerDetails}>
            <Text style={styles.farmerName}>{item.seller}</Text>

            <View style={styles.varietyRow}>
              <Icon name="leaf-outline" size={14} color="#10B981" />
              <Text style={styles.varietyText}>{item.category}</Text>
            </View>
            {/* {item.deliveryAddress ? (
              <View style={styles.locationRow}>
                <Icon name="home-outline" size={16} color="#3B82F6" />
                <Text style={styles.locationText}>{item.deliveryAddress}</Text>
              </View>
            ) : null} */}
          </View>
        </View>

        <View style={styles.locationRow}>
          <Icon name="location-outline" size={16} color="#EF4444" />
          <Text style={styles.locationText}>{
            typeof item.farmerLocation === 'string'
              ? item.farmerLocation
              : normalizeLocation(item.farmerLocation)
          }</Text>
        </View>

        {/* Action Buttons - Only Call and Message */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallFarmer(item)}
            activeOpacity={0.8}
          >
            <Icon name="call" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => handleContactSeller(item)}
            activeOpacity={0.8}
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
          : `You don't have any ${activeFilter} orders`}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Icon name="storefront-outline" size={18} color="#FFFFFF" />
          <Text style={styles.browseButtonText}>Explore Market</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const orderStats = getOrderStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#FFFFFF"

        barStyle="dark-content"
      />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSubtitle}>
              {orderStats.total} orders • {orderStats.accepted} active           </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('Opening notifications from header');
              navigation.navigate('Notification'); // Navigate to Notification screen
            }}
            style={styles.notificationButton}
            accessible={true}
            accessibilityLabel={`Notifications${unreadCount > 0 ? `. ${unreadCount} unread` : ''}`}
            accessibilityHint="Tap to view notifications"
            activeOpacity={0.7}
          >
            <Icon
              name="notifications-outline"
              size={24}
              color="#000000"
            />
            {!notificationsLoading && unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <NotificationBadge size="small" count={unreadCount} borderWidth={0} />
              </View>
            )}
            {notificationsLoading && (
              <View style={styles.notificationLoadingDot} />
            )}
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
          <FilterButton title="Accepted" value="accepted" count={orderStats.accepted} />
          <FilterButton title="Sold out" value="completed" count={orderStats.completed} />
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
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F08C',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginTop: 2,
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
  notificationLoadingDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA500',
    opacity: 0.8,
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
    paddingVertical: 10,
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
    top: -6,
    right: -6,
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
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Refined Farmer Details Section
  farmerDetails: {
    flex: 1,
    gap: 2,
    justifyContent: 'space-between',
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#0F172A',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    elevation: 2,
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
  // Removed duplicate messageBadge style
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
