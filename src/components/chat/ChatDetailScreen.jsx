import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { auth } from '../../config/firebaseModular';
import { subscribeMessages, sendMessage, markChatRead, buildChatId, fetchUserProfile, ensureChatExists, backfillChatParticipants, setTyping, subscribeTyping } from '../../services/chatService';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import useKeyboardLayoutMode from '../../hooks/useKeyboardLayoutMode';
import ChatInputBar from './ChatInputBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MESSAGE_AVATAR_SIZE = 32;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;

const COLORS = {
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  secondary: '#059669',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
  messageMe: '#10B981',
  messageOther: '#F3F4F6',
  online: '#10B981',
  typing: '#F59E0B',
  deal: '#3B82F6',
  price: '#EF4444',
};

const MessageBubble = React.memo(({ item, isMe, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}
  >
    <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
        {item.content}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
          {item.time}
        </Text>
        {isMe && (
          <MaterialCommunityIcons
            name="check-all"
            size={12}
            color="rgba(255, 255, 255, 0.7)"
            style={styles.readStatus}
          />
        )}
      </View>
    </View>
  </TouchableOpacity>
));

const TypingIndicator = React.memo(() => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      const animations = [dot1, dot2, dot3].map((dot, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      );
      Animated.parallel(animations).start();
    };
    animate();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          {[dot1, dot2, dot3].map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.typingDot,
                { opacity: dot, transform: [{ scale: dot }] }
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

const ChatDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const flatListRef = useRef(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const { keyboardHeightAnimated, keyboardHeight, keyboardVisible } = useKeyboardHeight();
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const { layoutMode, handleRootLayout, isResizeLike } = useKeyboardLayoutMode({ debounceMs: 100 });

  // Safe fallback for chat and avatar
  const defaultAvatar = require('../../../assets/logo.png');
  const currentUid = auth.currentUser?.uid || '';
  const paramChatId = route?.params?.chatId;
  const otherUid = route?.params?.otherUid;
  const initialName = route?.params?.name || 'Unknown';
  const initialAvatarUri = route?.params?.avatarUri || null;
  const chatId = paramChatId || (otherUid && currentUid ? buildChatId(currentUid, otherUid) : undefined);
  const [contact, setContact] = useState({
    name: initialName,
    avatar: initialAvatarUri ? { uri: initialAvatarUri } : defaultAvatar,
    online: false,
  });

  // State
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const initialScrollDone = useRef(false);
  const [messages, setMessages] = useState([]);


  const windowHeight = Dimensions.get("window").height;

  useEffect(() => {
    console.log("chat Window height:", windowHeight);
  }, [windowHeight]);
  // Auto-scroll when keyboard appears if near bottom
  useEffect(() => {
    if (keyboardVisible && isNearBottom) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [keyboardVisible, isNearBottom]);

  // Utility functions
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !chatId || !currentUid || !otherUid) return;
    const text = messageText.trim();
    setMessageText('');
    // ChatInputBar manages its own height; just refocus after send optionally
    requestAnimationFrame(() => inputRef.current?.focus?.());
    try {
      await ensureChatExists(chatId, [currentUid, otherUid]);
      await sendMessage(chatId, currentUid, otherUid, text);
      try { await setTyping(chatId, currentUid, false); } catch (_) { }
    } catch (e) {
      console.log('sendMessage error', e?.message || e);
    }
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [messageText, chatId, currentUid, otherUid]);

  const toggleMenu = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleMenuAction = useCallback((action) => {
    setShowMenu(false);
    switch (action) {
      case 'block':
        console.log('Block user');
        break;
      case 'report':
        console.log('Report user');
        break;
      case 'clear':
        setMessages([]);
        break;
      case 'info':
        console.log('User info');
        break;
      default:
        break;
    }
  }, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setShowMenu(false);
  }, []);

  // input height logic handled internally by ChatInputBar

  // Header animation effect
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  // Subscribe to other user's typing state (realtime)
  useEffect(() => {
    if (!chatId || !otherUid) return;
    const unsub = subscribeTyping(chatId, otherUid, (state) => setIsTyping(state));
    return () => { if (unsub) unsub(); };
  }, [chatId, otherUid]);

  // Update my typing state with debounce while composing
  const typingTimerRef = useRef(null);
  useEffect(() => {
    if (!chatId || !currentUid) return;
    const hasText = messageText.trim().length > 0;
    setTyping(chatId, currentUid, hasText).catch(() => { });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(chatId, currentUid, false).catch(() => { });
    }, 1500);
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, [messageText, chatId, currentUid]);

  // Subscribe to messages and mark chat read
  useEffect(() => {
    let unsub;
    (async () => {
      if (!chatId || !currentUid) return;
      // Best-effort backfill for legacy chats missing participants
      try { await backfillChatParticipants(chatId); } catch (_) { }
      unsub = subscribeMessages(chatId, (list) => {
        const mapped = list.map((m) => ({
          id: m.id,
          type: 'text',
          content: m.text,
          sender: m.senderId === currentUid ? 'me' : 'other',
          time: m.createdAt ? formatTime(new Date(m.createdAt)) : '',
          status: 'delivered',
        }));
        setMessages(mapped);
      });
      // mark as read on open
      await markChatRead(chatId, currentUid);
    })();
    return () => { if (unsub) unsub(); };
  }, [chatId, currentUid]);

  // Load contact profile if missing
  useEffect(() => {
    (async () => {
      if (!otherUid) return;
      if (contact.name && contact.avatar !== defaultAvatar) return;
      const fetched = await fetchUserProfile(otherUid);
      console.log('Fetched chat profile:', fetched);
      if (fetched) {
        const uri = fetched.profileImage || null;
        setContact((prev) => ({
          ...prev,
          name: fetched.displayName || prev.name,
          avatar: uri ? { uri } : prev.avatar,
        }));
      }
    })();
  }, [otherUid]);

  // Track if user is near bottom to avoid fighting user scroll
  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const threshold = 80; // px tolerance
    const atBottom = contentOffset.y + layoutMeasurement.height >= (contentSize.height - threshold);
    setIsNearBottom(atBottom);
  }, []);

  // Focus input programmatically (used when tapping messages or blank space if needed)
  const focusInput = useCallback(() => {
    inputRef.current?.focus?.();
  }, []);

  // Memoize contentContainerStyle to avoid prop churn on FlatList
  const messagesContentStyle = useMemo(() => {
    const kbExtra = isResizeLike ? 0 : keyboardHeight;
    return [
      styles.messagesContent,
      {
        paddingTop: HEADER_HEIGHT + insets.top + 20,
        paddingBottom: kbExtra + inputBarHeight + Math.max(insets.bottom, 8) + 12,
      }
    ];
  }, [insets.top, insets.bottom, keyboardHeight, inputBarHeight, isResizeLike]);

  // Memoized renderItem to avoid re-creating per render
  const renderItem = useCallback(({ item }) => (
    <MessageBubble item={item} isMe={item.sender === 'me'} onPress={focusInput} />
  ), [focusInput]);

  // Memoized footer to avoid unnecessary recalculations
  const ListFooter = useCallback(() => (isTyping ? <TypingIndicator /> : null), [isTyping]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT : 0}
      onLayout={handleRootLayout}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            style={styles.headerBlur}
            blurType="light"
            blurAmount={12}
            reducedTransparencyFallbackColor={COLORS.surface}
          />
        ) : (
          <View style={[styles.headerBlur, { backgroundColor: COLORS.surface }]} />
        )}
        {/* Only apply top safe area to avoid extra bottom padding in header */}
        <SafeAreaView
          edges={['top']}
          style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityLabel="Go back to previous screen"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userInfo} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                <Image
                  source={contact.avatar}
                  style={styles.headerAvatar}
                  onError={() => {
                    setContact((prev) => ({ ...prev, avatar: defaultAvatar }));
                  }}
                />
                {contact.online && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName} numberOfLines={1}>{contact.name}</Text>
                <Text style={styles.headerStatus}>
                  {isTyping ? 'typing...' : contact.online ? 'Active now' : 'Last seen recently'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                accessible={true}
                accessibilityLabel="Make voice call"
                accessibilityRole="button"
              >
                <Feather name="phone" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                onPress={toggleMenu}
                accessible={true}
                accessibilityLabel="More options menu"
                accessibilityRole="button"
              >
                <Feather name="more-vertical" size={20} color={COLORS.text} />
              </TouchableOpacity>

              {showMenu && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('info')}>
                    <Feather name="user" size={16} color={COLORS.text} />
                    <Text style={styles.menuText}>Profile Info</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('clear')}>
                    <Feather name="trash-2" size={16} color={COLORS.text} />
                    <Text style={styles.menuText}>Clear Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('report')}>
                    <Feather name="flag" size={16} color={COLORS.price} />
                    <Text style={[styles.menuText, { color: COLORS.price }]}>Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('block')}>
                    <Feather name="slash" size={16} color={COLORS.price} />
                    <Text style={[styles.menuText, { color: COLORS.price }]}>Block User</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Messages Container with FlatList */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={messagesContentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onLayout={() => {
            // Auto-scroll to bottom on initial load
            if (!initialScrollDone.current) {
              initialScrollDone.current = true;
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages are added
            if (isNearBottom) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          ListFooterComponent={ListFooter}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={7}
        />
      </View>

      <Animated.View
        style={[
          styles.inputContainer,
          (Platform.OS === 'android' && !isResizeLike)
            ? { bottom: keyboardHeightAnimated }
            : { bottom: 0 }
        ]}
      >
        <ChatInputBar
          ref={inputRef}
          value={messageText}
          onChangeText={setMessageText}
          onSend={handleSend}
          onHeightChange={setInputBarHeight}
          maxLength={1000}
          onFocus={() => setShowMenu(false)}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create(
  {
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    // Header Styles
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerBlur: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    headerContent: {
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 60,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    userInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: COLORS.surface,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: COLORS.online,
      borderWidth: 2,
      borderColor: COLORS.surface,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerName: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 2,
    },
    headerStatus: {
      fontSize: 13,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 4,
      position: 'relative',
    },
    headerActionBtn: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 45,
      right: 0,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      minWidth: 150,
      zIndex: 1000,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    menuText: {
      fontSize: 14,
      fontWeight: '500',
      color: COLORS.text,
    },

    // Messages Styles with FlatList
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 16,
      // Avoid flexGrow which can cause ScrollView content to fill height and disrupt scrolling
    },
    messageContainer: {
      maxWidth: SCREEN_WIDTH * 0.75,
      marginBottom: 12,
    },
    myMessageContainer: {
      alignSelf: 'flex-end',
    },
    otherMessageContainer: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      // Remove shadows/elevation for better scroll performance, especially on Android
      // shadowColor: COLORS.shadow,
      // shadowOffset: { width: 0, height: 1 },
      // shadowOpacity: 0.05,
      // shadowRadius: 2,
      // elevation: 1,
    },
    myBubble: {
      backgroundColor: COLORS.messageMe,
      borderBottomRightRadius: 6,
    },
    otherBubble: {
      backgroundColor: COLORS.surface,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '400',
    },
    myMessageText: {
      color: COLORS.surface,
    },
    otherMessageText: {
      color: COLORS.text,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      gap: 4,
    },
    messageTime: {
      fontSize: 12,
      fontWeight: '500',
    },
    myMessageTime: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    otherMessageTime: {
      color: COLORS.textSecondary,
    },
    readStatus: {
      marginLeft: 2,
    },

    // Typing Indicator
    typingContainer: {
      alignSelf: 'flex-start',
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    typingBubble: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    typingDots: {
      flexDirection: 'row',
      gap: 4,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.textSecondary,
    },

    // Input Styles
    inputContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.surface,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      zIndex: 100,
    },
    // old input-related styles removed (handled by ChatInputBar)
  }
);

export default ChatDetailScreen;