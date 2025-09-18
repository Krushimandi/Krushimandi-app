// Request Screen for Buyer
// In this screen requests are displayed sent by buyer only
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
  RefreshControl,
  Animated,
  Linking,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { firestore, doc, getDoc } from '../../config/firebaseModular';
import { buildChatId, ensureChatExists, fetchUserProfile } from '../../services/chatService';
import Clipboard from '@react-native-clipboard/clipboard';
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
      totalCount: requests.length,
      acceptedCount: requests.filter(r => r.status === 'accepted').length,
      loading,
      userRole: user?.role,
      preview: requests.slice(0, 2).map(r => ({
        id: r.id,
        productName: r.productSnapshot?.name,
        status: r.status
      }))
    });
  }, [requests, loading, user?.role]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Default to 'All' so user sees every request initially
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  // Collapsing header pattern: absolute header that hides on scroll up and returns on scroll down
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [collapsibleHeaderHeight, setCollapsibleHeaderHeight] = useState(120);
  const [headerHeight, setHeaderHeight] = useState(0);
  const clampMax = Math.max(collapsibleHeaderHeight, 1);
  const clampedScroll = React.useMemo(() => Animated.diffClamp(scrollY, 0, clampMax), [scrollY, clampMax]);
  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, clampMax],
    outputRange: [0, -clampMax],
    extrapolate: 'clamp',
  });
  const headerOpacity = clampedScroll.interpolate({
    inputRange: [0, clampMax * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Safely format any farmerLocation object into a displayable string
  const formatLocationValue = useCallback((loc) => {
    if (!loc) return 'Unknown Location';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      const { city, district, state, formattedAddress } = loc;
      const parts = [city, district, state].filter(p => !!p && String(p).trim().length > 0);
      if (parts.length > 0) return parts.join(', ');
      if (formattedAddress && typeof formattedAddress === 'string') return formattedAddress;
      try {
        return JSON.stringify(loc);
      } catch {
        return 'Unknown Location';
      }
    }
    return String(loc);
  }, []);

  // Filters now include Accepted and Sold (derived: delivered/completed) so buyer sees all lifecycle states here
  const filters = ['All', 'Pending', 'Accepted', 'Sold', 'Rejected', 'Cancelled', 'Expired'];
  const sortOptions = [
    { key: 'date', label: 'Date', icon: 'calendar-outline' },
    { key: 'alphabetical', label: 'A-Z', icon: 'list-outline' },
    { key: 'quantity', label: 'Quantity', icon: 'stats-chart-outline' },
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
        const nonActiveCount = requests.filter(r => r.status !== 'accepted').length;
        console.log('✅ Buyer requests loaded, total:', requests.length, 'displayed:', nonActiveCount);
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
  const soldStatusSet = new Set(['delivered', 'completed', 'complete', 'sold', 'soldout']);

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter(item => {
      const productName = item.productSnapshot?.name || '';
      const buyerName = item.buyerDetails?.name || '';
      const farmerName = item.productSnapshot?.farmerName || '';
      const locationStr = formatLocationValue(item.productSnapshot?.farmerLocation || '');
      const rawStatus = (item.status || '').toLowerCase();
      const derivedStatus = soldStatusSet.has(rawStatus) ? 'sold' : rawStatus; // map extended statuses

      const matchesSearch =
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locationStr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'All' ||
        derivedStatus === selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });

    // Sort requests (stable, multi-mode)
    filtered.sort((a, b) => {
      // Helpers kept inside to avoid polluting outer scope; cheap relative to list size
      const normString = (v) => (v || '').toString().trim().toLowerCase();
      const getDate = (tsPrimary, tsFallback) => {
        const ts = tsPrimary || tsFallback;
        if (!ts) return 0;
        if (typeof ts === 'string') {
          const t = Date.parse(ts);
            return isNaN(t) ? 0 : t;
        }
        if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
        try {
          return new Date(ts).getTime();
        } catch {
          return 0;
        }
      };
      const getQuantityPair = (q) => {
        if (!q) return [0,0];
        if (Array.isArray(q) && q.length === 2) {
          const min = Number(q[0]) || 0;
          const max = Number(q[1]) || 0;
          return [min, max];
        }
        const single = Number(q) || 0;
        return [single, single];
      };
      const getPrice = (p) => {
        if (p == null) return 0;
        if (typeof p === 'number') return p;
        if (typeof p === 'string') {
          const num = parseFloat(p.replace(/[^\d.]/g, ''));
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };

      // Primary comparator switch
      let cmp = 0;
      switch (sortBy) {
        case 'alphabetical': {
          const nameA = normString(a.productSnapshot?.name);
          const nameB = normString(b.productSnapshot?.name);
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'quantity': {
          // Ascending by min, then max (explicit requirement: treat array [min,max])
          const [amin, amax] = getQuantityPair(a.quantity);
          const [bmin, bmax] = getQuantityPair(b.quantity);
          if (amin !== bmin) cmp = amin - bmin; else cmp = amax - bmax;
          break;
        }
        case 'price': {
          // Descending (higher price first); adjust if user prefers ascending
          const priceA = getPrice(a.productSnapshot?.price);
          const priceB = getPrice(b.productSnapshot?.price);
          cmp = priceB - priceA;
          break;
        }
        case 'date':
        default: {
          // Newest first using updatedAt (fallback createdAt)
          const tA = getDate(a.updatedAt, a.createdAt);
          const tB = getDate(b.updatedAt, b.createdAt);
          cmp = tB - tA; // descending by timestamp
          break;
        }
      }

      if (cmp !== 0) return cmp;
      // Tie-breakers for stability: date desc, then name, then id
      const tA2 = getDate(a.updatedAt, a.createdAt);
      const tB2 = getDate(b.updatedAt, b.createdAt);
      if (tA2 !== tB2) return tB2 - tA2;
      const nA = normString(a.productSnapshot?.name);
      const nB = normString(b.productSnapshot?.name);
      if (nA !== nB) return nA.localeCompare(nB);
      return (a.id || '').localeCompare(b.id || '');
    });

    return filtered;
  }, [requests, searchQuery, selectedFilter, sortBy]);

  // Get statistics
  const stats = useMemo(() => {
    const total = requests.length; // Include accepted & sold
    const pending = requests.filter(r => r.status === RequestStatus.PENDING).length;
    const accepted = requests.filter(r => r.status === RequestStatus.ACCEPTED).length;
    const sold = requests.filter(r => soldStatusSet.has((r.status || '').toLowerCase())).length;
    const cancelled = requests.filter(r => r.status === RequestStatus.CANCELLED).length;
    const rejected = requests.filter(r => r.status === RequestStatus.REJECTED).length;
    const expired = requests.filter(r => r.status === RequestStatus.EXPIRED).length;

    return { total, pending, accepted, sold, cancelled, rejected, expired };
  }, [requests]);

  // Enhanced request tap handler
  const handleRequestTap = (item) => {
    const isBuyer = user?.role === 'buyer';
    const farmerName = item.productSnapshot?.farmerName || 'Unknown Farmer';
    const buyerName = item.buyerDetails?.name || 'Unknown Buyer';
    const productName = item.productSnapshot?.name || 'Unknown Product';
    let location = item.productSnapshot?.farmerLocation || 'Unknown Location';
    if (location && typeof location === 'object') {
      location = location.formattedAddress || JSON.stringify(location);
    }
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
  // Cache farmer phone numbers to avoid repeated Firestore hits
  const [farmerPhones, setFarmerPhones] = useState({});

  const getFarmerPhoneNumber = useCallback(async (farmerId) => {
    try {
      if (!farmerId) return null;
      if (farmerPhones[farmerId]) return farmerPhones[farmerId];
      console.log('🔍 (RequestsScreen) Fetching farmer phone for', farmerId);
      const ref = doc(firestore, 'profiles', farmerId);
      const snap = await getDoc(ref);
      console.log('🔍 (RequestsScreen) Farmer phone snapshot:', snap);

      if (snap.exists()) {
        const data = snap.data() || {};
        const phone = data.phoneNumber || data.phone || data.mobile || null;
        if (phone) {
          const masked = phone.replace(/(\+?\d{3})\d{4}(\d{2,})/, '$1****$2');
          console.log('📱 Farmer phone (masked):', masked);
          setFarmerPhones(prev => ({ ...prev, [farmerId]: phone }));
          return phone;
        }
      } else {
        console.log('⚠️ Farmer profile not found for', farmerId);
      }
    } catch (e) {
      console.warn('Failed to fetch farmer phone', e);
    }
    return null;
  }, [farmerPhones]);

  // Prefetch phone numbers for accepted requests so Call button is instant
  useEffect(() => {
    const acceptedFarmerIds = requests
      .filter(r => r.status === RequestStatus.ACCEPTED && r.farmerId)
      .map(r => r.farmerId);
    const unique = [...new Set(acceptedFarmerIds)].filter(id => !farmerPhones[id]);
    if (unique.length) {
      (async () => {
        for (const id of unique) {
          await getFarmerPhoneNumber(id);
        }
      })();
    }
  }, [requests, getFarmerPhoneNumber, farmerPhones]);

  const sanitizePhone = (phone) => (phone || '').replace(/[^\d+]/g, '');

  const handleCallFarmer = async (farmerId) => {
    try {
      const phoneRaw = await getFarmerPhoneNumber(farmerId);
      if (!phoneRaw) {
        Alert.alert('Contact unavailable', 'Farmer phone not found');
        return;
      }
      const phone = sanitizePhone(phoneRaw);
      if (!phone || phone.length < 7) {
        Alert.alert('Invalid number', 'Phone number appears invalid.');
        return;
      }
      const telUrl = `tel:${phone}`;
      console.log('📞 Dial attempt', telUrl);
      Linking.openURL(telUrl).catch(err => {
        console.warn('Primary tel: failed', err);
        // iOS alt
        const alt = `telprompt:${phone}`;
        Linking.openURL(alt).catch(() => {
          Alert.alert(
            'Unable to open dialer',
            `Please dial manually: ${phoneRaw}`,
            [
              { text: 'Copy', onPress: () => { Clipboard.setString(phoneRaw); Toast.show({ type: 'success', text1: 'Number Copied', position: 'bottom' }); } },
              { text: 'OK', style: 'cancel' }
            ]
          );
        });
      });
    } catch (e) {
      Alert.alert('Error', 'Could not initiate call');
    }
  };

  // Legacy-style comprehensive messaging logic from MyOrdersScreen
  const handleContactFarmer = async (farmerId, farmerDisplayName, productName) => {
    try {
      if (!farmerId) {
        Alert.alert('Farmer Unknown', 'Cannot find farmer ID for this request.');
        return;
      }

      // Delay-based loading alert (only shows if fetch is slow)
      const loadingTimeout = setTimeout(() => {
        Alert.alert('Getting Contact Info', 'Fetching farmer contact details...', [], { cancelable: false });
      }, 600);

      const phoneRaw = await getFarmerPhoneNumber(farmerId);
      clearTimeout(loadingTimeout);

      if (!phoneRaw) {
        Alert.alert('Contact Information Unavailable', `Could not find a phone number for ${farmerDisplayName || 'farmer'}.`);
        return;
      }

      const cleanPhone = sanitizePhone(phoneRaw);
      const demoMessage = `Hello ${farmerDisplayName || ''}! I have a question about ${productName || 'your product'}.`;
      const encodedMessage = encodeURIComponent(demoMessage);
      const smsUrl = `sms:${cleanPhone}?body=${encodedMessage}`;

      Linking.openURL(smsUrl)
        .then(() => console.log('✅ SMS intent opened'))
        .catch(err => {
          console.warn('Primary SMS failed, trying simple format', err);
          const simpleUrl = `sms:${cleanPhone}`;
          Linking.openURL(simpleUrl)
            .then(() => {
              Alert.alert('Compose Message', 'Paste the prepared message you copied.', [
                { text: 'OK' }
              ]);
            })
            .catch(() => {
              Alert.alert(
                'Unable to Open Messages',
                `Phone: ${phoneRaw}`,
                [
                  { text: 'Copy Number', onPress: () => Clipboard.setString(phoneRaw) },
                  { text: 'Copy Message', onPress: () => Clipboard.setString(demoMessage) },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            });
        });
    } catch (e) {
      console.error('handleContactFarmer error', e);
      Alert.alert('Error', 'Could not open messaging app');
    }
  };

  // Start in-app chat with farmer (for Accepted requests)
  const handleMessageInApp = useCallback(async (farmerId, farmerDisplayName) => {
    try {
      if (!user?.uid || !farmerId) return;
      const currentUid = user.uid;
      const chatId = buildChatId(currentUid, farmerId);

      // Fetch minimal meta for other participant for better list display
      let otherMeta = await fetchUserProfile(farmerId);
      const participantsMeta = otherMeta ? { [farmerId]: otherMeta } : undefined;

      // Ensure chat doc exists
      await ensureChatExists(chatId, [currentUid, farmerId], participantsMeta);

      // Navigate to ChatDetail with lightweight params
      navigation.navigate('ChatDetail', {
        chatId,
        otherUid: farmerId,
        name: farmerDisplayName || otherMeta?.displayName || 'User',
        avatarUri: otherMeta?.avatar || null,
      });
    } catch (e) {
      console.warn('Failed to start chat:', e?.message || e);
      Toast.show({ type: 'error', text1: 'Chat unavailable', text2: 'Please try again in a moment.', position: 'bottom' });
    }
  }, [user?.uid, navigation]);

  const renderRequestItem = ({ item, index }) => {
    const isBuyer = user?.role === 'buyer';
    const productName = item.productSnapshot?.name || 'Unknown Product';
    const farmerName = item.productSnapshot?.farmerName || 'Unknown Farmer';
    const buyerName = item.buyerDetails?.name || 'Unknown Buyer';
    const displayName = isBuyer ? farmerName : buyerName;
    const rawLocation = item.productSnapshot?.farmerLocation;
    const locationStr = formatLocationValue(rawLocation);
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
      if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
      return new Date(timestamp);
    };

    const requestDate = getDateFromTimestamp(item.updatedAt);

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
            <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">{locationStr}</Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.priceSection}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.quantity}>{quantity}</Text>
            </View>
            <Text style={styles.date}>
              {requestDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: requestDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          {item.status === RequestStatus.ACCEPTED && (
            <View style={styles.acceptedActionsRow}>
              <TouchableOpacity
                style={[styles.pillButton, styles.pillCall]}
                onPress={() => handleCallFarmer(item.farmerId)}
                activeOpacity={0.85}
              >
                <Icon name="call" size={16} color="#FFFFFF" />
                <Text style={styles.pillText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillButton, styles.pillMessage]}
                onPress={() => handleMessageInApp(item.farmerId, item.productSnapshot?.farmerName)}
                activeOpacity={0.85}
              >
                <Icon name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                <Text style={styles.pillText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.status !== RequestStatus.CANCELLED && item.status !== RequestStatus.ACCEPTED && (
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
      case 'sold': return '#2563EB';
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
      case 'sold': return '#DBEAFE';
      case 'cancelled': return '#F3F4F6';
      case 'rejected': return '#FEE2E2';
      case 'expired': return '#F9FAFB';
      default: return '#F3F4F6';
    }
  };

  // Filter chips moved to header menu; no inline chips

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

        barStyle="dark-content"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            {user?.role === 'buyer' ? 'My Requests' : 'Received Requests'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setFilterMenuVisible(true)}
            >
              <Icon name="options-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredAndSortedRequests.length} of {stats.total} requests
        </Text>
      </View>

      {/* Absolute collapsing header with Search + Chips */}
      <Animated.View
        style={{
          backgroundColor: '#F8FAFC',
          position: 'absolute',
          top: headerHeight,
          left: 0,
          right: 0,
          zIndex: 10,
          transform: [{ translateY: headerTranslateY }],
          opacity: headerOpacity,
        }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h && Math.abs(h - collapsibleHeaderHeight) > 2) setCollapsibleHeaderHeight(h);
        }}
      >
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

        {/* Chips (status filters) */}
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
      </Animated.View>

      {/* List */}
      <Animated.FlatList
        data={filteredAndSortedRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          // Ensure minimum height for scrolling even with few items
          filteredAndSortedRequests.length < 3 && {
            minHeight: Dimensions.get('window').height * 0.8
          },
          // Push content below the absolute collapsing header (static header + collapsible header)
          { paddingTop: collapsibleHeaderHeight }
        ]}
        ListHeaderComponent={null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              // Additional debug logging
              const scrollY = event.nativeEvent.contentOffset.y;
              console.log('📊 FlatList scroll event:', scrollY.toFixed(1));
            }
          }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
        ListEmptyComponent={
          <View style={[styles.emptyState, { minHeight: Dimensions.get('window').height * 0.4 }]}>
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

      {/* Sort Menu (Header Menu) */}
      <Modal
        visible={filterMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
          style={{ flex: 1 }}
        />
        {/* Menu container anchored below header */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 36,
            right: 12,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingVertical: 8,
            width: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#64748B',
            paddingHorizontal: 12,
            paddingVertical: 6,
            textTransform: 'uppercase'
          }}>
            Sort by
          </Text>
          {sortOptions.map((option) => {
            const isActive = sortBy === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => { setSortBy(option.key); setFilterMenuVisible(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                }}
                activeOpacity={0.8}
              >
                <Icon name={option.icon}
                  size={16}
                  color={isActive ? Colors.light.primary : '#6B7280'}
                />
                <Text style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 14,
                  color: isActive ? Colors.light.primary : '#111827',
                  fontWeight: isActive ? '700' : '500',
                }}>
                  {option.label}
                </Text>
                {isActive && <Icon name="checkmark" size={18} color={Colors.light.primary} style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

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
    zIndex: 20,
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
    minHeight: Dimensions.get('window').height, // Ensure scrollable content
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
  acceptedActionsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    gap: 6,
  },
  pillCall: {
    backgroundColor: '#059669',
  },
  pillMessage: {
    backgroundColor: '#2563EB',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
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
