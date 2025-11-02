import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants';
import Toast from 'react-native-toast-message';
import { useAuthState } from '../providers/AuthStateProvider';
import { useTabBarControl } from '../../utils/navigationControls';
import { auth } from '../../config/firebaseModular';
import { subscribeUserChats, fetchUserProfile, buildChatId, markChatRead, setUserOnlineStatus } from '../../services/chatService';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple debounce helper (short + inline to avoid extra deps)
const debounce = (fn, delay = 300) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

// Memoized chat item component for perf
const ChatItem = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarWrapper}>
        <Image source={item.avatar} style={styles.avatar} />
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.chatInfoWrapper}>
        <View style={styles.nameTimeRow}>
          <View style={styles.nameRow}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
            {item.status === 'typing' && (
              <View style={styles.typingBadge}><Text style={styles.typingBadgeText}>{t('chat.list.typing', { defaultValue: 'Typing…' })}</Text></View>
            )}
          </View>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[styles.chatMessage]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ChatListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { showTabBar } = useTabBarControl();
  const { user } = useAuthState();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'name'
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get screen dimensions for dynamic calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  // Calculate dynamic header heights based on content
  const baseHeaderHeight = statusBarHeight + 8 + 50; // Status bar + padding + title area
  const searchHeight = 52;
  const spacing = 30;
  const fullHeaderHeight = baseHeaderHeight + searchHeight + spacing;
  const collapsedHeaderHeight = baseHeaderHeight + 6;

  // Real chats from RTDB (profiles still from Firestore)
  const [chats, setChats] = useState([]);
  const [profiles, setProfiles] = useState({}); // cache { uid: { displayName, avatar } }

  const formatTime = useCallback((ts) => {
    try {
      if (!ts) return '';

      const date = new Date(ts);
      const now = new Date();

      // Validate date
      if (isNaN(date.getTime())) return '';

      const diff = now.getTime() - date.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;
      const oneYear = 365 * oneDay;

      // Less than 1 minute
      if (diff < 60 * 1000) {
        return 'Just now';
      }

      // Less than 1 hour
      if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}m ago`;
      }

      // Less than 1 day - show time
      if (diff < oneDay) {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }

      // Yesterday
      if (diff < 2 * oneDay) {
        return 'Yesterday ' + date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }

      // Less than 1 week - show full day name with time
      if (diff < oneWeek) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
          date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      // Less than 1 month - show "X days ago"
      if (diff < oneMonth) {
        const days = Math.floor(diff / oneDay);
        return `${days}d ago`;
      }

      // Less than 1 year - show short month, day and time
      if (diff < oneYear) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // Older than 1 year - show full date with year
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

    } catch (_) {
      return '';
    }
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    const unsub = subscribeUserChats(uid, async (list) => {
      // Resolve participant profiles lazily with cache
      const updates = {};
      const items = await Promise.all(list.map(async (c) => {
        const otherUid = (c.participants || []).find(p => p !== uid) || '';
        let displayName = 'User';
        let avatarUri = null;
        let phoneNumber = null;
        const meta = (c.participantsMeta && c.participantsMeta[otherUid]) || null;

        if (meta && (meta.displayName || meta.profileImage)) {
          displayName = meta.displayName || displayName;
          avatarUri = meta.profileImage || null;
          if (meta.phoneNumber) phoneNumber = meta.phoneNumber;
        } else if (profiles[otherUid]) {
          displayName = profiles[otherUid].displayName || displayName;
          avatarUri = profiles[otherUid].profileImage || null;
          if (profiles[otherUid].phoneNumber) phoneNumber = profiles[otherUid].phoneNumber;
        } else if (otherUid) {
          const fetched = await fetchUserProfile(otherUid);
          if (fetched) {
            updates[otherUid] = fetched;
            displayName = fetched.displayName || displayName;
            avatarUri = fetched.profileImage || null;
            if (fetched.phoneNumber) phoneNumber = fetched.phoneNumber;
          }
        }
        return {
          id: c.id,
          chatId: c.id,
          otherUid,
          name: displayName,
          phoneNumber,
          lastMessage: c.lastMessage || '',
          time: formatTime(c.updatedAt),
          updatedAt: c.updatedAt || 0,
          avatar: avatarUri ? { uri: avatarUri } : require('../../assets/icons/default-avatar.png'),
          unread: (c.unreadCount && c.unreadCount[uid]) || 0,
          online: false,
        };
      }));
      if (Object.keys(updates).length) setProfiles(prev => ({ ...prev, ...updates }));
      console.log('Fetched chats:', items);
      setChats(items);
      setLoading(false);
    }, (err) => {
      console.log('chat subscribe error', err?.message || err);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [setChats, setLoading, formatTime]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = useCallback(debounce(v => setDebouncedSearch(v.trim()), 300), []);

  const filteredChats = useMemo(() => {
    let arr = chats;
    // text filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      arr = arr.filter(c => c.name?.toLowerCase?.().includes(q));
    }
    // unread filter
    if (showUnreadOnly) {
      arr = arr.filter(c => (c.unread || 0) > 0);
    }
    // sort
    if (sortBy === 'name') {
      arr = [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      arr = [...arr].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    return arr;
  }, [chats, debouncedSearch, showUnreadOnly, sortBy]);

  // Show tab bar on focus (keeps consistency across navigation)
  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));

  // Set user online when ChatListScreen is focused, offline when unfocused
  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Set online when screen gains focus
      setUserOnlineStatus(uid, true);

      // Set offline when screen loses focus
      return () => {
        setUserOnlineStatus(uid, false);
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const handleChatPress = useCallback((chat) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const chatId = chat.chatId || buildChatId(uid, chat.otherUid);
    navigation.navigate('ChatDetail', {
      chatId,
      otherUid: chat.otherUid,
      name: chat.name,
      avatarUri: chat.avatar?.uri || null,
      phoneNumber: chat.phoneNumber || null,
    });
  }, [navigation]);

  const keyExtractor = useCallback(item => item.id, []);
  const renderItem = useCallback(({ item }) => (
    <ChatItem item={item} onPress={handleChatPress} />
  ), [handleChatPress]);

  // Animated values for collapsing header - dynamic based on screen
  const scrollThreshold = screenHeight * 0.18; // Increased for larger header (18% of screen height)

  const headerHeight = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [fullHeaderHeight, collapsedHeaderHeight],
    extrapolate: 'clamp'
  });

  const titleSize = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.6],
    outputRange: [28, 18],
    extrapolate: 'clamp'
  });

  const searchOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.45], // Slightly adjusted for larger search
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.45],
    outputRange: [0, -30], // Increased translate distance for larger search
    extrapolate: 'clamp'
  });

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF" />

      {/* Fixed Header */}
      <Animated.View style={[styles.headerWrapper, { paddingTop: insets.top, height: headerHeight }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
            <Animated.Text style={[styles.screenTitle, { fontSize: titleSize }]}>
              {t('chat.list.title', { defaultValue: 'Chats' })}
            </Animated.Text>
            <Text style={styles.screenSubtitle}>
              {t('chat.list.subtitle', { defaultValue: 'Stay connected with your buyers' })}
            </Text>
          </View>
          {/* <TouchableOpacity style={styles.iconButton} activeOpacity={0.8} onPress={() => setMenuVisible(true)}>
            <Icon name="ellipsis-vertical" size={22} color={Colors.light.textSecondary} />
          </TouchableOpacity> */}
        </View>

        {/* Search Bar */}
        <Animated.View style={[
          styles.searchFiltersRow,
          {
            opacity: searchOpacity,
            transform: [{ translateY: searchTranslateY }]
          }
        ]}>
          <View style={styles.searchWrapper}>
            <Icon name="search" size={18} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('chat.list.searchPlaceholder', { defaultValue: 'Search chats' })}
              placeholderTextColor={Colors.light.textSecondary + '80'}
              value={search}
              onChangeText={(v) => { setSearch(v); handleSearchChange(v); }}
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); handleSearchChange(''); }} style={styles.clearSearchBtn}>
                <Feather name="x" size={16} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Chat List */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      )}

      <Animated.FlatList
        data={filteredChats}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} tintColor={Colors.light.primary} />}
        contentContainerStyle={[
          styles.listContainer,
          filteredChats.length === 0 && styles.emptyListContainer,
          { paddingBottom: 110 + (Platform.OS === 'ios' ? 34 : 0) } // Dynamic bottom padding
        ]}
        style={styles.listStyle}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={72} color={Colors.light.primary + '60'} />
            <Text style={styles.emptyTitle}>{t('chat.list.emptyTitle', { defaultValue: 'No Chats' })}</Text>
            <Text style={styles.emptySubtitle}>{t('chat.list.emptySubtitle', { defaultValue: 'Start a conversation with your buyers to see chats here.' })}</Text>
            {user?.role === 'buyer' && (
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => {
                  Toast.show({
                    type: 'info',
                    position: 'bottom',
                    visibilityTime: 1000,
                    text1: t('chat.list.toast.startWithRequestTitle', { defaultValue: 'Start with a Request' }),
                    text2: t('chat.list.toast.startWithRequestMessage', { defaultValue: 'First send a request to the farmer, then chat.' }),
                  });
                  try {
                    navigation.navigate('Main', { screen: 'BuyerTabs', params: { screen: 'Home' } });
                  } catch (_) {
                    try { navigation.navigate('Home'); } catch (_) { }
                  }
                }}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.startChatButtonText}>{t('chat.list.startChat', { defaultValue: 'Start Chat' })}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={8}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={21}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 84, // Chat item height + margin
          offset: 84 * index,
          index,
        })}
      />

      {/* Three-dot Menu */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuSheet}>
            {user?.role === 'buyer' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setMenuVisible(false);
                Toast.show({
                  type: 'info',
                  position: 'bottom',
                  text1: t('chat.list.toast.startWithRequestTitle', { defaultValue: 'Start with a Request' }),
                  text2: t('chat.list.toast.startWithRequestMessage', { defaultValue: 'First send a request to the farmer, then chat.' }),
                  visibilityTime: 1000,
                });
                try {
                  navigation.navigate('Main', { screen: 'BuyerTabs', params: { screen: 'Home' } });
                } catch (_) { try { navigation.navigate('Home'); } catch (_) { } }
              }}>
                <Icon name="chatbubbles-outline" size={18} color="#111827" style={styles.menuIcon} />
                <Text style={styles.menuText}>{t('chat.list.menu.startNew', { defaultValue: 'Start New Chat' })}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onRefresh(); }}>
              <Icon name="refresh-outline" size={18} color="#111827" style={styles.menuIcon} />
              <Text style={styles.menuText}>{t('chat.list.menu.refresh', { defaultValue: 'Refresh' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowUnreadOnly(v => !v); }}>
              <Icon name={showUnreadOnly ? 'checkbox-outline' : 'square-outline'} size={18} color="#111827" style={styles.menuIcon} />
              <Text style={styles.menuText}>{showUnreadOnly ? t('chat.list.menu.showAll', { defaultValue: 'Show All Chats' }) : t('chat.list.menu.showUnread', { defaultValue: 'Show Unread Only' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setSortBy(s => (s === 'recent' ? 'name' : 'recent')); }}>
              <Icon name="swap-vertical-outline" size={18} color="#111827" style={styles.menuIcon} />
              <Text style={styles.menuText}>{sortBy === 'recent' ? t('chat.list.menu.sortByName', { defaultValue: 'Sort by Name' }) : t('chat.list.menu.sortByRecent', { defaultValue: 'Sort by Recent' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={async () => {
              try {
                const uid = auth.currentUser?.uid;
                if (!uid) { setMenuVisible(false); return; }
                const toMark = chats.filter(c => (c.unread || 0) > 0);
                await Promise.allSettled(toMark.map(c => markChatRead(uid, c.chatId)));
                Toast.show({ type: 'success', position: 'bottom', visibilityTime: 1000, text1: t('chat.list.toast.allMarkedRead', { defaultValue: 'All chats marked as read' }) });
              } catch (e) {
                Toast.show({ type: 'error', position: 'bottom', visibilityTime: 1000, text1: t('chat.list.toast.markAllReadFailed', { defaultValue: 'Failed to mark all as read' }) });
              } finally {
                setMenuVisible(false);
              }
            }}>
              <Icon name="checkmark-done-outline" size={18} color="#111827" style={styles.menuIcon} />
              <Text style={styles.menuText}>{t('chat.list.menu.markAllRead', { defaultValue: 'Mark All as Read' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); try { navigation.navigate('HelpScreen'); } catch (_) { } }}>
              <Icon name="help-circle-outline" size={18} color="#111827" style={styles.menuIcon} />
              <Text style={styles.menuText}>{t('chat.list.menu.help', { defaultValue: 'Help Center' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    shadowOpacity: 0.06,
    elevation: 3,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 12
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.7,
    fontFamily: "Boldonse-Regular",
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2
  },
  iconButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    position: 'relative'
  },

  searchFiltersRow: {
    marginTop: 10,
    marginBottom: 10
  },
  // Increased spacing for larger search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20, // Increased border radius for larger search
    paddingHorizontal: 16, // Slightly more padding
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 52, // Ensure minimum height for larger search
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500'
  }, // Slightly larger font and margin
  clearSearchBtn: {
    padding: 6,
    borderRadius: 14
  }, // Increased padding for better touch target
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8
  },
  listStyle: { flex: 1 },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74, // Ensure consistent height for getItemLayout
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFF'
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  chatInfoWrapper: { flex: 1 },
  nameTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '70%'
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
    maxWidth: '100%'
  },
  chatTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600'
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chatMessage: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
    fontWeight: '500'
  },
  typingBadge: {
    marginLeft: 6,
    backgroundColor: Colors.light.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  typingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 0.2
  },
  unreadBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    minWidth: 26,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center', marginTop: 6,
    lineHeight: 20
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14,
    marginTop: 18,
    gap: 6,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  fab: {
    position: 'absolute', right: 20,
    bottom: 110, backgroundColor: Colors.light.primaryDark,
    width: 58, height: 58, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.light.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.light.primary + '30'
  },
  // Menu styles
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  menuSheet: {
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuIcon: { marginRight: 10 },
  menuText: { fontSize: 14, color: '#111827', fontWeight: '600' },
});

export default ChatListScreen;