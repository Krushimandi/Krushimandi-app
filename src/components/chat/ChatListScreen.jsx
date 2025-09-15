import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants';
import { useTabBarControl } from '../../utils/navigationControls';

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
              <View style={styles.typingBadge}><Text style={styles.typingBadgeText}>Typing…</Text></View>
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
  const { showTabBar } = useTabBarControl();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get screen dimensions for dynamic calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  // Calculate dynamic header heights based on content
  const baseHeaderHeight = statusBarHeight + 8 + 50; // Status bar + padding + title area
  const searchHeight = 72;
  const spacing = 24;
  const fullHeaderHeight = baseHeaderHeight + searchHeight + spacing;
  const collapsedHeaderHeight = baseHeaderHeight + 6;

  // Static demo data (would come from backend / firestore)
  const chats = useMemo(() => ([
    { id: '1', name: 'Shawn Jones', lastMessage: 'I love them! 😍', time: '09:36', avatar: require('../../assets/student.jpeg'), unread: 0, online: true },
    { id: '2', name: 'Dianne Russell', lastMessage: 'Dianne is typing...', time: '08:42', avatar: require('../../assets/fruits/profile.jpg'), status: 'typing', unread: 2, online: true },
    { id: '3', name: 'Bessie Cooper', lastMessage: '🎤 Voice message', time: 'Yesterday', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '4', name: 'Leslie Alexander', lastMessage: 'See you tomorrow then, take...', time: 'Mon', avatar: require('../../assets/fruits/profile.jpg'), unread: 3, online: true },
    { id: '5', name: 'Robert Fox', lastMessage: 'Oh, thanks so much ❤️', time: '26 May', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '6', name: 'Guy Hawkins', lastMessage: '⚠️ Sticker', time: '12 Jun', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '7', name: 'Marvin McKinney', lastMessage: 'Thanks for the fresh apples! 🍎', time: '11:25', avatar: require('../../assets/fruits/profile.jpg'), unread: 1, online: true },
    { id: '8', name: 'Kristin Watson', lastMessage: 'When will the oranges be ready?', time: '10:15', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '9', name: 'Jenny Wilson', lastMessage: 'Perfect quality as always! 👌', time: 'Yesterday', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '10', name: 'Devon Lane', lastMessage: 'Can you deliver tomorrow?', time: 'Yesterday', avatar: require('../../assets/fruits/profile.jpg'), unread: 5, online: true },
    { id: '11', name: 'Ronald Richards', lastMessage: '📷 Photo', time: 'Tue', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '12', name: 'Theresa Webb', lastMessage: 'The mangoes were delicious! 🥭', time: 'Tue', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '13', name: 'Cody Fisher', lastMessage: 'Looking for bulk order...', time: 'Mon', avatar: require('../../assets/fruits/profile.jpg'), unread: 2, online: false },
    { id: '14', name: 'Savannah Nguyen', lastMessage: 'Great service! Will order again', time: 'Mon', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '15', name: 'Brooklyn Simmons', lastMessage: 'What time for pickup?', time: 'Sun', avatar: require('../../assets/fruits/profile.jpg'), unread: 1, online: false },
    { id: '16', name: 'Annette Black', lastMessage: 'The bananas are perfect! 🍌', time: 'Sun', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '17', name: 'Ralph Edwards', lastMessage: 'Do you have organic options?', time: 'Sat', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '18', name: 'Jane Cooper', lastMessage: 'Thank you for the quick delivery!', time: 'Sat', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '19', name: 'Albert Flores', lastMessage: 'Jane is typing...', time: 'Fri', avatar: require('../../assets/fruits/profile.jpg'), status: 'typing', unread: 3, online: true },
    { id: '20', name: 'Jacob Jones', lastMessage: '🎵 Audio message', time: 'Fri', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: false },
    { id: '21', name: 'Cameron Williamson', lastMessage: 'Amazing quality fruits! 🌟', time: 'Thu', avatar: require('../../assets/fruits/profile.jpg'), unread: 0, online: true },
    { id: '22', name: 'Esther Howard', lastMessage: 'Can I get a discount for bulk?', time: 'Thu', avatar: require('../../assets/fruits/profile.jpg'), unread: 1, online: false },
  ]), []);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = useCallback(debounce(v => setDebouncedSearch(v.trim()), 300), []);

  const filteredChats = useMemo(() => {
    return chats
      .filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [chats, debouncedSearch]);

  // Show tab bar on focus (keeps consistency across navigation)
  useFocusEffect(useCallback(() => { showTabBar(); }, [showTabBar]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const handleChatPress = useCallback((chat) => {
    navigation.navigate('ChatDetail', { chat });
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

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Fixed Header */}
      <Animated.View style={[styles.headerWrapper, { height: headerHeight }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
            <Animated.Text style={[styles.screenTitle, { fontSize: titleSize }]}>Chats</Animated.Text>
            <Text style={styles.screenSubtitle}>Stay connected with your buyers</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <Icon name="ellipsis-vertical" size={22} color={Colors.light.textSecondary} />
          </TouchableOpacity>
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
              placeholder="Search chats"
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
            <Feather name="message-circle" size={48} color={Colors.light.primary + '60'} />
            <Text style={styles.emptyTitle}>No Chats</Text>
            <Text style={styles.emptySubtitle}>Start a conversation with your buyers to see chats here.</Text>
            <TouchableOpacity style={styles.startChatButton} onPress={() => { /* placeholder */ }}>
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.startChatButtonText}>Start Chat</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
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
    marginTop: 12,
    marginBottom: 10
  }, // Increased spacing for larger search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20, // Increased border radius for larger search
    paddingHorizontal: 16, // Slightly more padding
    paddingVertical: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  nameTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
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
});

export default ChatListScreen;