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
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import FastImage from 'react-native-fast-image';
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
  setUserOnlineStatus,
  subscribeUserOnlineStatus,
} from '../../services/chatService';
import useKeyboardHeight from '../../hooks/useKeyboardHeight';
import useKeyboardLayoutMode from '../../hooks/useKeyboardLayoutMode';
import ChatInputBar from './ChatInputBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants'
import { useTranslation } from 'react-i18next'

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  // Mounted flag to prevent setState after unmount
  const isMountedRef = useRef(true);
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
  const initialName = route?.params?.name || t('chat.detail.unknownUser', { defaultValue: 'Unknown' });
  const initialPhone = route?.params?.phoneNumber || null;
  const initialAvatarUri = route?.params?.avatarUri || null;
  const chatId = paramChatId || (otherUid && currentUid ? buildChatId(currentUid, otherUid) : undefined);
  const [contact, setContact] = useState({
    name: initialName,
    avatar: initialAvatarUri ? { uri: initialAvatarUri } : defaultAvatar,
    online: false,
    phone: initialPhone,
  });

  // State
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Removed unused menu and scroll proximity state for production
  const initialScrollDone = useRef(false);
  const [messages, setMessages] = useState([]);
  // Defer clipping until after first scroll to bottom to avoid measurement issues
  const [clippingEnabled, setClippingEnabled] = useState(false);
  // Roles for gating calls
  const [myRole, setMyRole] = useState(null);
  const [otherRole, setOtherRole] = useState(null);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Set user online when entering chat and offline when leaving
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    // Set online when component mounts
    setUserOnlineStatus(uid, true);
    
    // Set offline when component unmounts
    return () => {
      setUserOnlineStatus(uid, false);
    };
  }, []);

  // Subscribe to other user's online status
  useEffect(() => {
    if (!otherUid) return;
    
    const unsubscribe = subscribeUserOnlineStatus(otherUid, (isOnline, lastSeen) => {
      if (isMountedRef.current) {
        setContact(prev => ({
          ...prev,
          online: isOnline,
        }));
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [otherUid]);

  // Utility functions
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    // ChatInputBar manages its own height; just refocus after send optionally
    requestAnimationFrame(() => inputRef.current?.focus?.());
    try {
      await ensureChatExists(chatId, [currentUid, otherUid]);
      await sendMessage(chatId, currentUid, otherUid, text);
      try { await setTyping(chatId, currentUid, false); } catch (_) { }
    } catch (e) {
    }
    // No auto-scroll after sending; user controls position
  }, [messageText, chatId, currentUid, otherUid]);

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
          const ok = await requestService.isLatestRequestAccepted(buyerId, farmerId);
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
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('chat.detail.cannotCallTitle', { defaultValue: 'Cannot start call' }), t('chat.detail.cannotCallBody', { defaultValue: 'Your device cannot open the phone dialer.' }));
      }
    } catch (e) {
      Alert.alert(t('chat.detail.callFailedTitle', { defaultValue: 'Call failed' }), t('chat.detail.callFailedBody', { defaultValue: 'Unable to initiate the call.' }));
    }
  }, [contact?.phone, otherUid, myRole, otherRole]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);
  
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
  const typingTimerRef = useRef(null);
  const lastTypingSentRef = useRef(false);
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

  // Load contact profile if missing
  useEffect(() => {
    (async () => {
      if (!otherUid) return;
      // Always ensure we have a phone number; don't early-return just because name/avatar are set
      if (!contact.phone || !contact.name || contact.avatar === defaultAvatar) {
        const fetched = await fetchUserProfile(otherUid);
        if (fetched) {
          const uri = fetched.profileImage || null;
          const phone = fetched.phoneNumber || null;
          if (isMountedRef.current) {
            setContact((prev) => ({
              ...prev,
              name: fetched.displayName || prev.name,
              avatar: uri ? { uri } : prev.avatar,
              phone: phone || prev.phone,
            }));
          }
          // capture other user's role for call gating
          const role = (fetched.userRole || fetched.role || fetched.userType || '').toLowerCase();
          if (role && isMountedRef.current) setOtherRole(role);
        }
      } else {
        // still attempt to get role for gating if we haven't yet
        if (!otherRole) {
          const fetched = await fetchUserProfile(otherUid);
          const role = (fetched?.userRole || fetched?.role || fetched?.userType || '').toLowerCase();
          if (role && isMountedRef.current) setOtherRole(role);
        }
      }
    })();
  }, [otherUid, contact.phone, contact.name, contact.avatar, otherRole]);

  // Load my profile role for robust gating
  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      if (!myRole) {
        try {
          const mine = await fetchUserProfile(uid);
          const role = (mine?.userRole || '').toLowerCase();
          if (role && isMountedRef.current) setMyRole(role);
        } catch (_) { /* ignore */ }
      }
    })();
  }, [myRole]);

  // Track if user is near bottom to avoid fighting user scroll
  // Focus input programmatically (used when tapping messages or blank space if needed)
  const focusInput = useCallback(() => {
    inputRef.current?.focus?.();
  }, []);

  // Memoize contentContainerStyle to avoid prop churn on FlatList
  const messagesContentStyle = useMemo(() => {
    // In Android adjustPan-like mode, we add keyboardHeight as bottom inset
    // so messages stay above the keyboard; the input bar is absolute.
    const extraKeyboardPad = (Platform.OS === 'android' && !isResizeLike && keyboardVisible)
      ? keyboardHeight
      : 0;
    return [
      styles.messagesContent,
      {
        paddingTop: HEADER_HEIGHT + insets.top + 20,
        // Ensure last messages sit above input + keyboard (in pan mode) while keeping a small gutter
        paddingBottom: inputBarHeight + extraKeyboardPad + Math.max(insets.bottom, 8) + BOTTOM_GUTTER,
      }
    ];
  }, [insets.top, insets.bottom, inputBarHeight, isResizeLike, keyboardVisible, keyboardHeight]);

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
                      : t('chat.detail.lastSeenRecently', { defaultValue: 'Last seen recently' })}
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