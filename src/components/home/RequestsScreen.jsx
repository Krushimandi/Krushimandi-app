import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { useTabBarControl } from '../../utils/navigationControls.ts';

// Enhanced request data with more details
const REQUESTS_DATA = [
  {
    id: 'r1',
    fruitName: 'Premium Hapus Mango',
    price: '₹120/KG',
    farmerName: 'Kishor Patil',
    requestDate: '2025-06-28',
    status: 'pending',
    priority: 'high',
    quantity: '50 KG',
    location: 'Ratnagiri, MH',
    estimatedResponse: '2 hours',
    category: 'Fruits',
    organic: true,
    rating: 4.8,
  },
  {
    id: 'r2',
    fruitName: 'Kashmiri Apple',
    price: '₹180/KG',
    farmerName: 'Ramesh Kumar',
    requestDate: '2025-06-27',
    status: 'accepted',
    farmerContact: '+91 98765 43210',
    priority: 'medium',
    quantity: '25 KG',
    location: 'Srinagar, JK',
    category: 'Fruits',
    organic: false,
    rating: 4.6,
    responseTime: '1 hour',
  },
  {
    id: 'r3',
    fruitName: 'Organic Spinach',
    price: '₹40/KG',
    farmerName: 'Anita Patil',
    requestDate: '2025-06-25',
    status: 'rejected',
    priority: 'low',
    quantity: '10 KG',
    location: 'Pune, MH',
    category: 'Vegetables',
    organic: true,
    rating: 4.4,
    rejectionReason: 'Out of stock',
  },
  {
    id: 'r4',
    fruitName: 'Basmati Rice',
    price: '₹85/KG',
    farmerName: 'Singh Farms',
    requestDate: '2025-06-29',
    status: 'expired',
    priority: 'high',
    quantity: '100 KG',
    location: 'Punjab',
    category: 'Grains',
    organic: false,
    rating: 4.7,
  },
];

const RequestsScreen = () => {
  const navigation = useNavigation();
  const { showTabBar } = useTabBarControl();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const filters = ['All', 'Pending', 'Accepted', 'Rejected', 'Expired'];
  const sortOptions = [
    { key: 'date', label: 'Date', icon: 'calendar-outline' },
    { key: 'priority', label: 'Priority', icon: 'flag-outline' },
    { key: 'status', label: 'Status', icon: 'checkmark-circle-outline' },
    { key: 'price', label: 'Price', icon: 'pricetag-outline' },
  ];

  useEffect(() => {
    showTabBar();
    loadRequests();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setRequests(REQUESTS_DATA);
        setLoading(false);
      }, 800);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load requests');
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
      const matchesSearch = item.fruitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'All' ||
        item.status.toLowerCase() === selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });

    // Sort requests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'status':
          const statusOrder = { pending: 1, accepted: 2, rejected: 3, expired: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'price':
          const priceA = parseFloat(a.price.replace(/[^\d.]/g, ''));
          const priceB = parseFloat(b.price.replace(/[^\d.]/g, ''));
          return priceB - priceA;
        default: // date
          return new Date(b.requestDate) - new Date(a.requestDate);
      }
    });

    return filtered;
  }, [requests, searchQuery, selectedFilter, sortBy]);

  // Get statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const accepted = requests.filter(r => r.status === 'accepted').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const expired = requests.filter(r => r.status === 'expired').length;

    return { total, pending, accepted, rejected, expired };
  }, [requests]);

  // Enhanced request tap handler
  const handleRequestTap = (item) => {
    if (item.status === 'accepted' && item.farmerContact) {
      Alert.alert(
        'Farmer Contact',
        `${item.farmerName}\n📱 ${item.farmerContact}\n📍 ${item.location}\n⭐ ${item.rating}/5`,
        [
          { text: 'Call', onPress: () => Linking.openURL(`tel:${item.farmerContact}`) },
          { text: 'Message', onPress: () => Linking.openURL(`sms:${item.farmerContact}`) },
          { text: 'Close', style: 'cancel' }
        ]
      );
    } else {
      const statusInfo = getStatusInfo(item);
      Alert.alert(
        'Request Details',
        `${item.fruitName}\n\nFarmer: ${item.farmerName}\nLocation: ${item.location}\nQuantity: ${item.quantity}\nStatus: ${item.status}\nPriority: ${item.priority}\n${item.organic ? '🌱 Organic' : ''}${statusInfo}`,
        [
          { text: 'OK' },
          ...(item.status === 'rejected' || item.status === 'expired' ?
            [{ text: 'Resend', onPress: () => resendRequest(item.id) }] : [])
        ]
      );
    }
  };

  // Get additional status info
  const getStatusInfo = (item) => {
    switch (item.status) {
      case 'pending':
        return `\nExpected response: ${item.estimatedResponse}`;
      case 'accepted':
        return `\nResponse time: ${item.responseTime}`;
      case 'rejected':
        return `\nReason: ${item.rejectionReason}`;
      default:
        return '';
    }
  };

  // Resend request
  const resendRequest = (id) => {
    const updatedRequests = requests.map(item =>
      item.id === id ? { ...item, status: 'pending', requestDate: new Date().toISOString().split('T')[0] } : item
    );
    setRequests(updatedRequests);
    Alert.alert('Success', 'Request has been resent!');
  };

  // Cancel request
  const cancelRequest = (id) => {
    Alert.alert(
      'Cancel Request',
      'Remove this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => setRequests(requests.filter(item => item.id !== id))
        }
      ]
    );
  };

  // Enhanced request item rendering
  const renderRequestItem = ({ item, index }) => (
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
            <Text style={styles.productName}>{item.fruitName}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.farmerInfo}>
            <Icon name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.farmerName}>{item.farmerName}</Text>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={12} color="#F59E0B" />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Icon name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.location}>{item.location}</Text>
          {item.organic && (
            <View style={styles.organicBadge}>
              <Text style={styles.organicText}>🌱 Organic</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceSection}>
            <Text style={styles.price}>{item.price}</Text>
            <Text style={styles.quantity}>{item.quantity}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.requestDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: new Date(item.requestDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            })}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => cancelRequest(item.id)}
        >
          <Icon name="close" size={16} color="#EF4444" />
        </TouchableOpacity>

        {(item.status === 'rejected' || item.status === 'expired') && (
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => resendRequest(item.id)}
          >
            <Icon name="refresh" size={16} color="#10B981" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  // Enhanced color functions
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusBg = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#FEF3C7';
      case 'accepted': return '#D1FAE5';
      case 'rejected': return '#FEE2E2';
      case 'expired': return '#F3F4F6';
      default: return '#F3F4F6';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Render filter chips
  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 50 }} // max height to avoid full-height scroll
      contentContainerStyle={{
        paddingHorizontal: 10,
        alignItems: 'center' // important for vertical wrap
      }}
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Requests</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Icon name="options-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
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
                : 'Start by sending requests to farmers'}
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 20,
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 12,
  },
  filterContent: {
    paddingRight: 16,
    paddingVertical: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    height: 32,
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
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
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
    paddingBottom: 100, // Extra space for bottom navigation
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  requestContent: {
    padding: 16,
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
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  cancelButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  resendButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

export default RequestsScreen;
