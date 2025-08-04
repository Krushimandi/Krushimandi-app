// Request Screen for Buyer 
// In this screen requests are displayed sended by  buyer only
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextInput,
  ScrollView,
  RefreshControl,
  Animated,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { getHeaderConstants } from '../../constants/Layout';
import { useTabBarControl } from '../../utils/navigationControls.ts';
import { useRequests } from '../../hooks/useRequests';
import { useAuthState } from '../providers/AuthStateProvider';
import { Request, RequestStatus } from '../../types/Request';
import Toast from 'react-native-toast-message';
// Add import for testing notifications
import { sendTestNotification } from '../../utils/testNotifications';

const RequestsScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const { user } = useAuthState();
  const insets = useSafeAreaInsets();
  const headerConstants = getHeaderConstants(insets.top);
  const {
    requests,
    loading,
    loadBuyerRequests,
    cancelRequest: cancelRequestService,
    resendRequest: resendRequestService
  } = useRequests();

  // Debug: Log requests state changes
  useEffect(() => {
    console.log('📊 Requests state updated:', {
      count: requests.length,
      loading,
      userRole: user?.role,
      requestsPreview: requests.slice(0, 2).map(r => ({
        id: r.id,
        productName: r.productSnapshot?.name,
        status: r.status
      }))
    });
  }, [requests, loading, user?.role]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Pending');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // const filters = ['All', 'Pending', 'Accepted', 'Rejected', 'Expired'];
  const filters = ['Pending', 'Rejected', 'Cancelled', 'Expired'];
  const sortOptions = [
    { key: 'date', label: 'Date', icon: 'calendar-outline' },
    { key: 'status', label: 'Status', icon: 'checkmark-circle-outline' },
    { key: 'price', label: 'Price', icon: 'pricetag-outline' },
  ];

  useEffect(() => {
    console.log('🔄 RequestsScreen useEffect triggered, user:', {
      uid: user?.uid,
      role: user?.role,
      userExists: !!user
    });

    showTabBar();
    loadRequests();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [user]);

  // Refresh data when screen comes into focus (to see updates from farmers)
  useFocusEffect(
    useCallback(() => {
      console.log('🔍 Screen focused, refreshing requests...');
      loadRequests();
    }, [user])
  );

  const loadRequests = async () => {
    try {
      console.log('🔍 Loading requests for user:', {
        uid: user?.uid,
        role: user?.role,
        userExists: !!user
      });

      if (!user?.uid) {
        console.log('❌ No user UID found, returning');
        return;
      }

      if (user.role === 'buyer') {
        console.log('👤 Loading buyer requests...');
        await loadBuyerRequests();
        console.log('✅ Buyer requests loaded, count:', requests.length);
      } else {
        console.log('⚠️ This is a buyer-only screen. User role:', user.role);
      }
    } catch (error) {
      console.error('❌ Error loading requests:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load requests. Please try again.',
        position: 'bottom',
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  // Advanced filtering and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter(item => {
      const productName = item.productSnapshot?.name || '';
      const buyerName = item.buyerDetails?.name || '';
      const farmerName = item.productSnapshot?.farmerName || '';
      const location = item.productSnapshot?.farmerLocation || '';

      const matchesSearch =
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'All' ||
        item.status.toLowerCase() === selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });

    // Sort requests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          const statusOrder = { pending: 1, accepted: 2, cancelled: 3, rejected: 4, expired: 5 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'price':
          const priceA = parseFloat(a.productSnapshot?.price?.toString().replace(/[^\d.]/g, '') || '0');
          const priceB = parseFloat(b.productSnapshot?.price?.toString().replace(/[^\d.]/g, '') || '0');
          return priceB - priceA;
        default: // date
          // Handle both Firestore Timestamp and string dates
          const getDateFromTimestamp = (timestamp) => {
            if (!timestamp) return new Date(0);
            if (typeof timestamp === 'string') return new Date(timestamp);
            if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
            if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
            return new Date(timestamp);
          };

          return getDateFromTimestamp(b.createdAt).getTime() - getDateFromTimestamp(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [requests, searchQuery, selectedFilter, sortBy]);

  // Get statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === RequestStatus.PENDING).length;
    const accepted = requests.filter(r => r.status === RequestStatus.ACCEPTED).length;
    const cancelled = requests.filter(r => r.status === RequestStatus.CANCELLED).length;
    const rejected = requests.filter(r => r.status === RequestStatus.REJECTED).length;
    const expired = requests.filter(r => r.status === RequestStatus.EXPIRED).length;

    return { total, pending, accepted, cancelled, rejected, expired };
  }, [requests]);

  // Enhanced request tap handler
  const handleRequestTap = (item) => {
    const isBuyer = user?.role === 'buyer';
    const farmerName = item.productSnapshot?.farmerName || 'Unknown Farmer';
    const buyerName = item.buyerDetails?.name || 'Unknown Buyer';
    const productName = item.productSnapshot?.name || 'Unknown Product';
    const location = item.productSnapshot?.farmerLocation || 'Unknown Location';
    const quantity = Array.isArray(item.quantity) ?
      `${item.quantity[0]}-${item.quantity[1]} ${item.quantityUnit || 'ton'}` :
      `${item.quantity} ${item.quantityUnit || 'ton'}`;

    if (item.status === RequestStatus.ACCEPTED && item.buyerDetails?.phone) {
      const contactName = isBuyer ? farmerName : buyerName;
      const contactPhone = isBuyer ? item.buyerDetails.phone : item.buyerDetails?.phone;

      if (contactPhone) {
        Alert.alert(
          'Contact Details',
          `${contactName}\n📱 ${contactPhone}\n📍 ${location}\n⭐ N/A/5`,
          [
            { text: 'Call', onPress: () => Linking.openURL(`tel:${contactPhone}`) },
            { text: 'Message', onPress: () => Linking.openURL(`sms:${contactPhone}`) },
            { text: 'Close', style: 'cancel' }
          ]
        );
        return;
      }
    }

    const statusInfo = getStatusInfo(item);
    const roleSpecificName = isBuyer ? `Farmer: ${farmerName}` : `Buyer: ${buyerName}`;

    const actions = [{ text: 'OK' }];

    // Buyer actions only
    if (isBuyer) {
      // Add resend option for cancelled and rejected requests
      if (item.status === RequestStatus.CANCELLED || item.status === RequestStatus.REJECTED || item.status === RequestStatus.EXPIRED) {
        actions.unshift({ text: 'Resend', onPress: () => handleResendRequest(item.id) });
      }
      // Add delete option for all requests
      actions.unshift({ text: 'Delete', onPress: () => handleCancelRequest(item.id), style: 'destructive' });
    }

    // Alert.alert(
    //   'Request Details',
    //   `${productName}\n\n${roleSpecificName}\nLocation: ${location}\nQuantity: ${quantity}\nStatus: ${item.status}\n${statusInfo}`,
    //   actions
    // );
  };

  // Get additional status info
  const getStatusInfo = (item) => {
    switch (item.status) {
      case RequestStatus.PENDING:
        return '\nExpected response: 24-48 hours';
      case RequestStatus.ACCEPTED:
        const getDateFromTimestamp = (timestamp) => {
          if (!timestamp) return new Date(0);
          if (typeof timestamp === 'string') return new Date(timestamp);
          if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
          if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
          return new Date(timestamp);
        };

        const responseTime = item.respondedAt ?
          Math.round((getDateFromTimestamp(item.respondedAt) - getDateFromTimestamp(item.createdAt)) / (1000 * 60 * 60)) + ' hours' :
          'Recently';
        return `\nResponse time: ${responseTime}`;
      case RequestStatus.CANCELLED:
        return '\nRequest was cancelled by buyer';
      case RequestStatus.REJECTED:
        return item.rejectionReason ? `\nReason: ${item.rejectionReason}` : '';
      default:
        return '';
    }
  };

  // Cancel request (buyer action)
  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRequestService(requestId);
              Toast.show({
                type: 'error',
                text1: 'Request Deleted',
                text2: 'Your request has been deleted successfully.',
                position: 'bottom',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete request. Please try again.',
                position: 'bottom',
              });
            }
          }
        }
      ]
    );
  };

  // Resend request (buyer action)
  const handleResendRequest = async (requestId) => {
    try {
      await resendRequestService(requestId);
      Toast.show({
        type: 'success',
        text1: 'Request Resent',
        text2: 'Your request has been resent successfully.',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to resend request. Please try again.',
        position: 'bottom',
      });
    }
  };

  // Enhanced request item rendering
  const renderRequestItem = ({ item, index }) => {
    const isBuyer = user?.role === 'buyer';
    const productName = item.productSnapshot?.name || 'Unknown Product';
    const farmerName = item.productSnapshot?.farmerName || 'Unknown Farmer';
    const buyerName = item.buyerDetails?.name || 'Unknown Buyer';
    const displayName = isBuyer ? farmerName : buyerName;
    const location = item.productSnapshot?.farmerLocation || 'Unknown Location';
    const price = item.productSnapshot?.price ? `₹${item.productSnapshot.price}/${item.productSnapshot.priceUnit || 'TON'}` : 'Price not available';
    const quantity = Array.isArray(item.quantity) ?
      `${item.quantity[0]}-${item.quantity[1]} ${item.quantityUnit || 'ton'}` :
      `${item.quantity} ${item.quantityUnit || 'ton'}`;
    const rating = 0; // Rating not available in current structure

    // Helper function to safely convert timestamp to Date
    const getDateFromTimestamp = (timestamp) => {
      if (!timestamp) return new Date();
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
      return new Date(timestamp);
    };

    const requestDate = getDateFromTimestamp(item.createdAt);

    return (
      <Animated.View
        style={[
          styles.requestItem,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.requestContent}
          onPress={() => handleRequestTap(item)}
          activeOpacity={0.7}
        >
          <View style={styles.requestHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.productName}>{productName}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.farmerInfo}>
              <Icon name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.farmerName}>{displayName}</Text>
              {rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={12} color="#F59E0B" />
                  <Text style={styles.rating}>{rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.locationRow}>
            <Icon name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.location}>{location}</Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.priceSection}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.quantity}>{quantity}</Text>
            </View>
            <Text style={styles.date}>
              {requestDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: requestDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          {/* Buyer actions only */}
          {item.status !== RequestStatus.CANCELLED && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(item.id)}
            >
              <Icon name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}

          {(item.status === RequestStatus.CANCELLED || item.status === RequestStatus.REJECTED || item.status === RequestStatus.EXPIRED) && (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => handleResendRequest(item.id)}
            >
              <Icon name="refresh" size={16} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  // Enhanced color functions
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'cancelled': return '#6B7280';
      case 'rejected': return '#EF4444';
      case 'expired': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const getStatusBg = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#FEF3C7';
      case 'accepted': return '#D1FAE5';
      case 'cancelled': return '#F3F4F6';
      case 'rejected': return '#FEE2E2';
      case 'expired': return '#F9FAFB';
      default: return '#F3F4F6';
    }
  };

  // Render filter chips
  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterChipText,
              selectedFilter === filter && styles.filterChipTextActive
            ]}>
              {filter}
            </Text>
            {filter !== 'All' && (
              <Text style={[
                styles.filterCount,
                selectedFilter === filter && styles.filterCountActive
              ]}>
                {stats[filter.toLowerCase()] || 0}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#FFFFFF"
        translucent={false}
        barStyle="dark-content"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            {user?.role === 'buyer' ? 'My Requests' : 'Received Requests'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Icon name="options-outline" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Debug: Test Notification Button - Remove in production */}
            <TouchableOpacity
              style={[styles.sortButton, styles.testNotificationButton]}
              onPress={async () => {
                const success = await sendTestNotification();
                Toast.show({
                  type: success ? 'success' : 'error',
                  text1: success ? 'Test Notification Sent' : 'Failed to Send',
                  text2: success ? 'Check your notification screen' : 'Error sending test notification',
                  position: 'bottom',
                });
              }}
            >
              <Icon name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredAndSortedRequests.length} of {stats.total} requests
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, farmers, locations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {renderFilterChips()}

      {/* Sort Options */}
      {showFilters && (
        <View style={styles.sortContainer}>
          <Text style={styles.sortTitle}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.sortOptionActive
                ]}
                onPress={() => setSortBy(option.key)}
              >
                <Icon
                  name={option.icon}
                  size={16}
                  color={sortBy === option.key ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredAndSortedRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'All' ? 'No matching requests' : 'No requests found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilter !== 'All'
                ? 'Try adjusting your search or filters'
                : user?.role === 'buyer'
                  ? 'Start by sending requests to farmers'
                  : 'Buyers will send requests for your products'}
            </Text>
          </View>
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    // Shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44, // Ensure touch target size
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.1,
  },

  sortButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  testNotificationButton: {
    backgroundColor: '#10B981',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 0, // Remove default padding for better alignment
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 12,
  },
  filterContent: {
    paddingRight: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 36,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
    lineHeight: 14,
  },
  filterCountActive: {
    color: Colors.light.primary,
    backgroundColor: '#FFFFFF',
  },
  sortContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sortTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    lineHeight: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    minHeight: 36,
  },
  sortOptionActive: {
    backgroundColor: Colors.light.primary,
  },
  sortOptionText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 5,
    fontWeight: '500',
    lineHeight: 18,
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Better spacing for navigation
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  requestContent: {
    padding: 18,
  },
  requestHeader: {
    marginBottom: 10,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 10,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
    lineHeight: 14,
  },
  detailsRow: {
    marginBottom: 6,
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerName: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 5,
    fontWeight: '500',
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  rating: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 3,
    fontWeight: '600',
    lineHeight: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 5,
    flex: 1,
    lineHeight: 16,
  },
  organicBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  organicText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '500',
    lineHeight: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
    lineHeight: 20,
  },
  quantity: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    lineHeight: 14,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  resendButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default RequestsScreen;
