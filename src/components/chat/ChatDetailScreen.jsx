import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import FastImage from 'react-native-fast-image';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReAnimated, { useAnimatedStyle, withTiming, useSharedValue, runOnJS } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { auth } from '../../config/firebaseModular';
import { requestService } from '../../services/requestService';
import {
  subscribeMessages,
  sendMessage,
  markChatRead,
  buildChatId,
  fetchUserProfile,
  ensureChatExists,
  backfillChatParticipants,
  setTyping,
  subscribeTyping,
  subscribeUserOnlineStatus,
  setUserOnlineStatus,
} from '../../services/chatService';
import ChatInputBar from './ChatInputBar';
import { Colors } from '../../constants';
import LoadingOverlay from 'utils/LoadingOverlay';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const BOTTOM_GUTTER = 12;

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
    const loops = [dot1, dot2, dot3].map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    // Start loops
    loops.forEach(l => l.start());
    // Cleanup to stop loops on unmount
    return () => loops.forEach(l => l.stop());
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isMountedRef = useRef(true);
  const inputRef = useRef(null);
  const flatListRef = useRef(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const typingTimerRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const initialScrollDone = useRef(false);
  
  // Keyboard height as shared value
  const keyboardHeight = useSharedValue(0);

  // Keyboard handler
  useKeyboardHandler({
    onStart: (e) => {
      'worklet';
      console.log('Keyboard start:', e.height);
      keyboardHeight.value = e.height;
    },
    onMove: (e) => {
      'worklet';
      keyboardHeight.value = e.height;
    },
    onEnd: (e) => {
      'worklet';
      console.log('Keyboard end:', e.height);
      keyboardHeight.value = e.height;
    },
  });

  // Debug keyboard height
  useEffect(() => {
    console.log('chat Keyboard height shared value created');
  }, []);

  // Constants
  const defaultAvatar = require('../../../assets/logo.png');
  const currentUid = auth.currentUser?.uid || '';
  const paramChatId = route?.params?.chatId;
  const otherUid = route?.params?.otherUid;
  const initialName = route?.params?.name || t('chat.detail.unknownUser', { defaultValue: 'Unknown' });
  const initialPhone = route?.params?.phoneNumber || null;
  const initialAvatarUri = route?.params?.avatarUri || null;
  const chatId = paramChatId || (otherUid && currentUid ? buildChatId(currentUid, otherUid) : undefined);

  // State
  const [contact, setContact] = useState({
    name: initialName,
    avatar: initialAvatarUri ? { uri: initialAvatarUri } : defaultAvatar,
    online: false,
    phone: initialPhone,
    lastSeen: null,
  });
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [otherRole, setOtherRole] = useState(null);
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [inputBarHeight, setInputBarHeight] = useState(0);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);



  // Subscribe to other user's online status (read-only, doesn't set our own status)
  useEffect(() => {
    if (!otherUid) return;

    const unsubscribe = subscribeUserOnlineStatus(otherUid, (isOnline, lastSeen) => {
      if (isMountedRef.current) {
        setContact(prev => ({
          ...prev,
          online: isOnline,
          lastSeen: lastSeen || null,
        }));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [otherUid]);

  // Set current user online when ChatDetailScreen is focused, offline when unfocused
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

  // Utility functions
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format last seen time in a compact way
  const formatLastSeen = useCallback((lastSeenISO) => {
    if (!lastSeenISO) return t('chat.detail.lastSeenRecently', { defaultValue: 'Last seen recently' });
    // If lastSeen is the string "online", don't format it (handled by online status check in UI)
    if (lastSeenISO === "online") return t('chat.detail.activeNow', { defaultValue: 'Active now' });
    const lastSeenDate = new Date(lastSeenISO);
    // Check if the date is valid
    if (isNaN(lastSeenDate.getTime())) return t('chat.detail.lastSeenRecently', { defaultValue: 'Last seen recently' });
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // < 1 min
    if (diffMinutes < 1) {
      return t('chat.detail.lastSeenJustNow', { defaultValue: 'Last seen just now' });
    }

    // < 60 min
    if (diffMinutes < 60) {
      return t('chat.detail.lastSeenMinutesAgo', { defaultValue: 'Last seen {{minutes}}m ago', minutes: diffMinutes });
    }

    // Today
    const isToday = lastSeenDate.toDateString() === now.toDateString();
    if (isToday) {
      const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return t('chat.detail.lastSeenToday', { defaultValue: 'Last seen today at {{time}}', time: timeStr });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = lastSeenDate.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return t('chat.detail.lastSeenYesterday', { defaultValue: 'Last seen yesterday at {{time}}', time: timeStr });
    }

    // < 24h (but not today/yesterday) → fallback hours
    if (diffHours < 24) {
      return t('chat.detail.lastSeenHoursAgo', { defaultValue: 'Last seen {{hours}}h ago', hours: diffHours });
    }

    // < 7 days
    if (diffDays < 7) {
      const dayName = lastSeenDate.toLocaleDateString('en-US', { weekday: 'short' });
      const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return t('chat.detail.lastSeenDay', { defaultValue: 'Last seen {{day}} at {{time}}', day: dayName, time: timeStr });
    }

    // Same year
    const isSameYear = lastSeenDate.getFullYear() === now.getFullYear();
    if (isSameYear) {
      const monthShort = lastSeenDate.toLocaleDateString('en-US', { month: 'short' });
      const day = lastSeenDate.getDate();
      const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return t('chat.detail.lastSeenDate', { defaultValue: 'Last seen {{month}} {{day}} at {{time}}', month: monthShort, day, time: timeStr });
    }

    // Different year
    const monthShort = lastSeenDate.toLocaleDateString('en-US', { month: 'short' });
    const day = lastSeenDate.getDate();
    const year = lastSeenDate.getFullYear();
    const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return t('chat.detail.lastSeenDateYear', { defaultValue: 'Last seen {{month}} {{day}}, {{year}} at {{time}}', month: monthShort, day, year, time: timeStr });
  }, [t]);

  // Memoize the formatted last seen text to avoid recalculating on every render
  const formattedLastSeen = useMemo(() => {
    return formatLastSeen(contact.lastSeen);
  }, [contact.lastSeen, formatLastSeen]);


  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !chatId || !currentUid || !otherUid) return;
    const text = messageText.trim();

    // Guard: prevent sharing phone numbers, emails, Instagram handles/links, or any links
    const containsEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
    // Strip non-digits to detect long digit sequences (10+)
    const digitsOnly = text.replace(/[^0-9]/g, '');
    const containsPhoneLike = digitsOnly.length >= 10; // generic phone detection
    const containsUrl = /(https?:\/\/|www\.)\S+/i.test(text);
    const containsWhatsAppLink = /(wa\.me\/|(?:api\.)?whatsapp\.com\/|chat\.whatsapp\.com\/)/i.test(text);
    const containsInstagramLink = /(instagram\.com\/|ig\.me\/)/i.test(text);
    // Detect @handle not part of an email
    const textWithoutEmails = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, '');
    const containsAtHandle = /(^|\s)@[a-z0-9._]{3,}/i.test(textWithoutEmails);
    const mentionsIG = /(\big\b|\binsta\b|\binstagram\b)/i.test(text);
    const containsInstagramHandle = containsAtHandle && mentionsIG;

    if (containsEmail || containsPhoneLike || containsUrl || containsInstagramLink || containsInstagramHandle || containsWhatsAppLink) {
      Alert.alert(
        t('chat.detail.sharingBlockedTitle', { defaultValue: 'Not allowed' }),
        t('chat.detail.sharingBlockedBody', { defaultValue: 'Sharing phone numbers, email addresses, social handles (e.g., Instagram), WhatsApp links, or any links is not allowed in chat.' })
      );
      return;
    }

    setMessageText('');
    requestAnimationFrame(() => inputRef.current?.focus?.());
    try {
      await ensureChatExists(chatId, [currentUid, otherUid]);
      await sendMessage(chatId, currentUid, otherUid, text);
      try { await setTyping(chatId, currentUid, false); } catch (_) { }
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }, [messageText, chatId, currentUid, otherUid, t]);

  // Place a phone call using the device dialer
  const handleCall = useCallback(async () => {
    const phone = contact?.phone;
    if (!phone) {
      Alert.alert(t('chat.detail.noPhoneTitle', { defaultValue: 'No phone number' }), t('chat.detail.noPhoneBody', { defaultValue: 'This user has no phone number available.' }));
      return;
    }

    try {
      // If current user is a buyer and other party is a farmer (or unknown), ensure the latest request is accepted
      const buyerId = auth.currentUser?.uid;
      const farmerId = otherUid;
      if (buyerId && farmerId && (myRole?.toLowerCase?.() === 'buyer')) {
        // Only strictly require farmer on the other side; if unknown, fail-closed and still check
        const shouldCheck = !otherRole || otherRole?.toLowerCase?.() === 'farmer';
        if (shouldCheck) {
          setIsRoleSwitching(true);
          const ok = await requestService.isLatestRequestAccepted(buyerId, farmerId);
          setIsRoleSwitching(false);
          if (!ok) {
            Alert.alert(t('chat.detail.requestNotAcceptedTitle', { defaultValue: 'Request not accepted' }), t('chat.detail.requestNotAcceptedBody', { defaultValue: 'You can call once the farmer accepts your latest request.' }));
            return;
          }
        }
      }
    } catch (_) {
      // If we can’t verify, fail closed
      Alert.alert(t('chat.detail.requestNotAcceptedTitle', { defaultValue: 'Request not accepted' }), t('chat.detail.requestNotAcceptedBody', { defaultValue: 'You can call once the farmer accepts your latest request.' }));
      return;
    }

    // Sanitize to digits and plus, then open dialer
    const cleaned = String(phone).replace(/[^0-9+]/g, '');
    const url = `tel:${cleaned}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('chat.detail.callFailedTitle', { defaultValue: 'Call failed' }), t('chat.detail.callFailedBody', { defaultValue: 'Unable to initiate the call.' }));
    }
  }, [contact?.phone, otherUid, myRole, otherRole, t]);

  // Header animation effect
  useEffect(() => {
    const anim = Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      // Stop animation on unmount to avoid leaks
      anim.stop();
    };
  }, [headerOpacity]);

  // Subscribe to other user's typing state (realtime)
  useEffect(() => {
    if (!chatId || !otherUid) return;
    const unsub = subscribeTyping(chatId, otherUid, (state) => setIsTyping(state));
    return () => { if (unsub) unsub(); };
  }, [chatId, otherUid]);

  // Update my typing state with debounce while composing
  useEffect(() => {
    if (!chatId || !currentUid) return;
    const hasText = messageText.trim().length > 0;

    // Send "typing: true" only on transition to avoid spamming writes
    if (hasText && !lastTypingSentRef.current) {
      setTyping(chatId, currentUid, true).catch(() => { });
      lastTypingSentRef.current = true;
    }

    // Debounce clearing the typing state
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (lastTypingSentRef.current) {
        setTyping(chatId, currentUid, false).catch(() => { });
        lastTypingSentRef.current = false;
      }
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
        if (!isMountedRef.current) return;
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

  // Ensure initial position starts at bottom once messages and input height are ready
  useEffect(() => {
    if (!messages.length || initialScrollDone.current || !inputBarHeight) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        initialScrollDone.current = true;
        if (Platform.OS === 'android') setClippingEnabled(true);
      }, 0);
    });
  }, [messages.length, inputBarHeight]);

  // Load contact profile and roles
  useEffect(() => {
    if (!otherUid) return;

    const loadProfile = async () => {
      try {
        const fetched = await fetchUserProfile(otherUid);
        if (!fetched || !isMountedRef.current) return;

        const uri = fetched.profileImage || null;
        const phone = fetched.phoneNumber || null;
        const role = (fetched.userRole || fetched.role || fetched.userType || '').toLowerCase();

        setContact((prev) => ({
          ...prev,
          name: fetched.displayName || prev.name,
          avatar: uri ? { uri } : prev.avatar,
          phone: phone || prev.phone,
          lastSeen: fetched.lastSeen,
        }));

        if (role) setOtherRole(role);
      } catch (error) {
        console.error('Failed to load contact profile:', error);
      }
    };

    loadProfile();
  }, [otherUid]);

  // Load my profile role for call gating
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || myRole) return;

    const loadMyRole = async () => {
      try {
        const mine = await fetchUserProfile(uid);
        const role = (mine?.userRole || '').toLowerCase();
        if (role && isMountedRef.current) setMyRole(role);
      } catch (error) {
        console.error('Failed to load user role:', error);
      }
    };

    loadMyRole();
  }, [myRole]);

  // Focus input programmatically
  const focusInput = useCallback(() => {
    inputRef.current?.focus?.();
  }, []);

  // Memoize contentContainerStyle to avoid prop churn on FlatList
  const messagesContentStyle = useMemo(() => {
    return [
      styles.messagesContent,
      {
        paddingTop: HEADER_HEIGHT + insets.top + 20,
        // Ensure last messages sit above input while keeping a small gutter
        paddingBottom: inputBarHeight + Math.max(insets.bottom, 8) + BOTTOM_GUTTER,
      }
    ];
  }, [insets.top, insets.bottom, inputBarHeight]);

  // Memoized renderItem to avoid re-creating per render
  const renderItem = useCallback(({ item }) => (
    <MessageBubble item={item} isMe={item.sender === 'me'} onPress={focusInput} />
  ), [focusInput]);

  // Memoized footer to avoid unnecessary recalculations
  const ListFooter = useCallback(() => (isTyping ? <TypingIndicator /> : null), [isTyping]);

  // Animated style for the fake view at bottom
  const fakeViewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const h = keyboardHeight.value;
    console.log('Fake view height:', h);
    return {
      height: withTiming(h, { duration: 0 }),
      backgroundColor: 'rgba(255, 0, 0, 0.3)', // Debug: red background
    };
  });

  return (
    <View style={styles.container}>
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
              accessibilityLabel={t('chat.detail.a11y.goBack', { defaultValue: 'Go back to previous screen' })}
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userInfo} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                <FastImage
                  source={
                    contact?.avatar?.uri
                      ? { uri: contact.avatar.uri, cache: FastImage.cacheControl.immutable, priority: FastImage.priority.normal }
                      : contact.avatar
                  }
                  style={styles.headerAvatar}
                  onError={() => {
                    if (isMountedRef.current) setContact((prev) => ({ ...prev, avatar: defaultAvatar }));
                  }}
                  resizeMode={FastImage.resizeMode.cover}
                />
                {contact.online && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName} numberOfLines={1}>{contact.name}</Text>
                <Text style={styles.headerStatus}>
                  {isTyping
                    ? t('chat.detail.typing', { defaultValue: 'typing...' })
                    : contact.online
                      ? t('chat.detail.activeNow', { defaultValue: 'Active now' })
                      : formattedLastSeen}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                onPress={handleCall}
                accessible={true}
                accessibilityLabel={t('chat.detail.a11y.call', { defaultValue: 'Make voice call' })}
                accessibilityRole="button"
              >
                <Feather name="phone" size={20} color={COLORS.primary} />
              </TouchableOpacity>
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
          removeClippedSubviews={Platform.OS === 'android' && clippingEnabled}
          scrollEventThrottle={16}
          onLayout={() => { /* initial scroll handled in effect once input height known */ }}
          onContentSizeChange={() => { /* no-op to avoid premature flagging */ }}
          ListFooterComponent={ListFooter}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={7}
        />
      </View>

      <View style={styles.inputContainer}>
        <ChatInputBar
          ref={inputRef}
          value={messageText}
          onChangeText={setMessageText}
          onSend={handleSend}
          onHeightChange={setInputBarHeight}
          maxLength={1000}
        />
      </View>

      {/* Fake animated view at bottom to push content up when keyboard opens */}
      <ReAnimated.View style={fakeViewAnimatedStyle} />

      <LoadingOverlay
        visible={isRoleSwitching}
        message={t('common.loading', { defaultValue: 'Loading...' })}
        spinnerColor="#43B86C"
      />
    </View>
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

    // Messages Styles with FlatList
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 16,
      // Make content fill available height and align to bottom so short chats stick to bottom
      flexGrow: 1,
      justifyContent: 'flex-end'
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
    },
    myBubble: {
      backgroundColor: COLORS.messageMe,
      borderBottomRightRadius: 6,
      borderWidth: 1,
      borderColor: Colors.light.primary,
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
      backgroundColor: COLORS.surface,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      zIndex: 100,
    },
  }
);

export default ChatDetailScreen;