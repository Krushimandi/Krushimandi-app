import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { auth } from '../../config/firebaseModular';
import { subscribeMessages, sendMessage, markChatRead, buildChatId, fetchUserProfile, ensureChatExists, backfillChatParticipants, setTyping, subscribeTyping } from '../../services/chatService';
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

const MessageBubble = React.memo(({ item, isMe }) => {
  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
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
    </View>
  );
});

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
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const inputContainerTranslateY = useRef(new Animated.Value(0)).current;

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const initialScrollDone = useRef(false);
  const [messages, setMessages] = useState([]);

  // Keyboard event handlers
  useEffect(() => {
    const keyboardWillShow = (event) => {
      const kbHeight = event?.endCoordinates?.height ?? 0;
      setKeyboardVisible(true);

      Animated.parallel([
        Animated.timing(inputContainerTranslateY, {
          toValue: -kbHeight,
          duration: event.duration || 250,
          useNativeDriver: true,
        }),
        Animated.timing(keyboardHeight, {
          toValue: kbHeight,
          duration: event.duration || 250,
          useNativeDriver: false,
        })
      ]).start();

      // Auto-scroll to bottom when keyboard shows if user is near bottom
      if (isNearBottom) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const keyboardWillHide = (event) => {
      setKeyboardVisible(false);

      Animated.parallel([
        Animated.timing(inputContainerTranslateY, {
          toValue: 0,
          duration: event.duration || 250,
          useNativeDriver: true,
        }),
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: event.duration || 250,
          useNativeDriver: false,
        })
      ]).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideListener = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [inputContainerTranslateY, keyboardHeight, isNearBottom]);

  // Utility functions
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !chatId || !currentUid || !otherUid) return;
    const text = messageText.trim();
    setMessageText('');
    setInputHeight(48);
    try {
      await ensureChatExists(chatId, [currentUid, otherUid]);
      await sendMessage(chatId, currentUid, otherUid, text);
      try { await setTyping(chatId, currentUid, false); } catch (_) {}
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

  // Handle input height changes
  const handleContentSizeChange = useCallback((event) => {
    const { height } = event.nativeEvent.contentSize;
    const next = Math.min(Math.max(height + 24, 48), 120);
    // Avoid tiny oscillations causing repeated re-renders
    setInputHeight(prev => (Math.abs(prev - next) > 1 ? next : prev));
  }, []);

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
    setTyping(chatId, currentUid, hasText).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(chatId, currentUid, false).catch(() => {});
    }, 1500);
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, [messageText, chatId, currentUid]);

  // Subscribe to messages and mark chat read
  useEffect(() => {
    let unsub;
    (async () => {
      if (!chatId || !currentUid) return;
      // Best-effort backfill for legacy chats missing participants
      try { await backfillChatParticipants(chatId); } catch (_) {}
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

  // Memoize contentContainerStyle to avoid prop churn on FlatList
  const messagesContentStyle = useMemo(() => ([
    styles.messagesContent,
    {
      paddingTop: HEADER_HEIGHT + insets.top + 20,
      paddingBottom: keyboardVisible ? 20 : 120,
    }
  ]), [insets.top, keyboardVisible]);

  // Memoized renderItem to avoid re-creating per render
  const renderItem = useCallback(({ item }) => (
    <MessageBubble item={item} isMe={item.sender === 'me'} />
  ), []);

  // Memoized footer to avoid unnecessary recalculations
  const ListFooter = useCallback(() => (isTyping ? <TypingIndicator /> : null), [isTyping]);

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
        <SafeAreaView style={styles.headerContent}>
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

      {/* Input Container - Always stays above keyboard */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            transform: [{ translateY: inputContainerTranslateY }],
          }
        ]}
      >
        <View style={[
          styles.inputWrapper,
          {
            paddingBottom: Math.max(insets.bottom, 20),
            minHeight: inputHeight + 32,
          }
        ]}>
          <View style={styles.inputRow}>
            <View style={[
              styles.textInputContainer,
              { minHeight: inputHeight }
            ]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  { minHeight: inputHeight }
                ]}
                placeholder="Type your message..."
                placeholderTextColor={COLORS.textTertiary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                selectionColor={COLORS.primary}
                onContentSizeChange={handleContentSizeChange}
                accessible={true}
                accessibilityLabel="Message input field"
                accessibilityHint="Type your message here"
              />

              {messageText.length > 500 && (
                <View style={styles.characterCounter}>
                  <Text style={styles.characterCountText}>
                    {1000 - messageText.length}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                messageText.trim() && styles.sendButtonActive
              ]}
              onPress={messageText.trim() ? handleSend : undefined}
              disabled={!messageText.trim()}
              activeOpacity={0.8}
              accessible={true}
              accessibilityLabel={messageText.trim() ? "Send message" : "Type a message to send"}
              accessibilityRole="button"
            >
              <Animated.View style={[
                styles.sendIconContainer,
                messageText.trim() && styles.sendIconActive
              ]}>
                {messageText.trim() ? (
                  <Feather name="send" size={20} color="#FFFFFF" />
                ) : (
                  <Feather name="edit-3" size={20} color={COLORS.textSecondary} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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
    inputWrapper: {
      paddingHorizontal: 16,
      paddingTop: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    textInputContainer: {
      flex: 1,
      backgroundColor: 'rgba(249, 250, 251, 0.8)',
      borderRadius: 25,
      borderWidth: 1.5,
      borderColor: 'rgba(229, 231, 235, 0.6)',
      paddingHorizontal: 18,
      maxHeight: 120,
      position: 'relative',
      justifyContent: 'center',
      shadowColor: 'rgba(16, 185, 129, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 4,
    },
    textInput: {
      fontSize: 16,
      color: COLORS.text,
      fontWeight: '400',
      lineHeight: 22,
      textAlignVertical: 'center',
      alignContent: 'center',
    },
   
    characterCounter: {
      position: 'absolute',
      bottom: 4,
      right: 8,
      backgroundColor: 'rgba(107, 114, 128, 0.1)',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    characterCountText: {
      fontSize: 10,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(229, 231, 235, 0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sendButtonActive: {
      backgroundColor: COLORS.primary,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      transform: [{ scale: 1.05 }],
    },
    sendIconContainer: {
      transform: [{ scale: 1 }],
    },
    sendIconActive: {
      transform: [{ scale: 1.1 }],
    },
  }
);

export default ChatDetailScreen;