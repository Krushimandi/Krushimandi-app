import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const INPUT_MIN_HEIGHT = 52;
const MESSAGE_AVATAR_SIZE = 32;

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
  }, []);

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
  const { chat } = route.params;
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'text',
      content: 'Hello! I saw your fresh apples listing. What\'s your best price for 50kg?',
      sender: 'other',
      time: '09:32',
      status: 'delivered',
    },
    {
      id: '2',
      type: 'text',
      content: 'Hi! Thanks for your interest. For 50kg premium apples, I can offer ₹120 per kg. These are freshly harvested organic apples.',
      sender: 'me',
      time: '09:35',
      status: 'read',
    },
    {
      id: '3',
      type: 'text',
      content: 'That sounds good! Can you do ₹110 per kg? I\'m a regular buyer and will need this quantity weekly.',
      sender: 'other',
      time: '09:37',
      status: 'delivered',
    },
    {
      id: '4',
      type: 'text',
      content: 'For regular weekly orders, I can do ₹115 per kg. This includes free delivery within 10km. Deal?',
      sender: 'me',
      time: '09:40',
      status: 'delivered',
    },
    {
      id: '5',
      type: 'text',
      content: 'Perfect! That works for me. When can you deliver the first batch?',
      sender: 'other',
      time: '09:42',
      status: 'delivered',
    },
  ]);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const handleSend = useCallback(() => {
    if (messageText.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        type: 'text',
        content: messageText.trim(),
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messageText]);

  const toggleMenu = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleMenuAction = useCallback((action) => {
    setShowMenu(false);
    switch(action) {
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

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderMessage = useCallback(({ item, index }) => {
    const isMe = item.sender === 'me';
    const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.sender !== item.sender);
    
    return (
      <View style={styles.messageWrapper}>
        {!isMe && showAvatar && (
          <Image source={chat.avatar} style={styles.messageAvatar} />
        )}
        {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}
        <MessageBubble 
          item={item} 
          isMe={isMe}
        />
      </View>
    );
  }, [messages, chat.avatar]);

  const keyExtractor = useCallback((item) => item.id, []);

  const memoizedMessages = useMemo(() => 
    messages.concat(isTyping ? [{ id: 'typing', type: 'typing', sender: 'other' }] : [])
  , [messages, isTyping]);

  useEffect(() => {
    const timer = setTimeout(() => setIsTyping(true), 2000);
    const hideTimer = setTimeout(() => setIsTyping(false), 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <BlurView 
          style={styles.headerBlur}
          blurType="light"
          blurAmount={15}
          reducedTransparencyFallbackColor={COLORS.surface}
        />
        
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.userInfo} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                <Image source={chat.avatar} style={styles.headerAvatar} />
                {chat.online && <View style={styles.onlineIndicator} />}
              </View>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName} numberOfLines={1}>{chat.name}</Text>
                <Text style={styles.headerStatus}>
                  {isTyping ? 'typing...' : chat.online ? 'Active now' : 'Last seen recently'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionBtn} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                <Feather name="phone" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionBtn} 
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                onPress={toggleMenu}
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

      <KeyboardAwareScrollView
        style={styles.keyboardAwareContainer}
        contentContainerStyle={styles.keyboardAwareContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
        extraHeight={Platform.OS === 'ios' ? 20 : 0}
        showsVerticalScrollIndicator={false}
      >
        <FlatList
          ref={flatListRef}
          data={memoizedMessages}
          renderItem={({ item }) => {
            if (item.type === 'typing') {
              return <TypingIndicator />;
            }
            return renderMessage({ item, index: memoizedMessages.indexOf(item) });
          }}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={[styles.messagesContent, { 
            paddingBottom: Math.max(insets.bottom + 20, 40) 
          }]}
          showsVerticalScrollIndicator={false}
          inverted={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </KeyboardAwareScrollView>

      <View style={styles.inputContainer}>
        <SafeAreaView style={styles.modernInputSafeArea}>
          <View style={[styles.modernInputMainContainer, { 
            paddingBottom: Math.max(insets.bottom, 20) 
          }]}>
            <View style={styles.modernInputRow}>
              <View style={styles.messageInputContainer}>
                <View style={styles.glassInputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.glassTextInput}
                    placeholder="Type your message..."
                    placeholderTextColor={COLORS.textTertiary}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={1000}
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                    selectionColor={COLORS.primary}
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
                    styles.modernSendBtn, 
                    messageText.trim() && styles.modernSendBtnActive
                  ]}
                  onPress={messageText.trim() ? handleSend : undefined}
                  disabled={!messageText.trim()}
                  activeOpacity={0.8}
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
                  
                  {messageText.trim() && (
                    <View style={styles.sendButtonGlow} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  keyboardAwareContainer: {
    flex: 1,
  },
  keyboardAwareContent: {
    flexGrow: 1,
  },
  
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  
  messagesList: {
    flex: 1,
    paddingTop: HEADER_HEIGHT + (Platform.OS === 'android' ? 25 : 44),
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageAvatar: {
    width: MESSAGE_AVATAR_SIZE,
    height: MESSAGE_AVATAR_SIZE,
    borderRadius: MESSAGE_AVATAR_SIZE / 2,
    marginRight: 8,
  },
  avatarSpacer: {
    width: MESSAGE_AVATAR_SIZE + 8,
  },
  messageContainer: {
    maxWidth: SCREEN_WIDTH * 0.75,
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
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    marginLeft: MESSAGE_AVATAR_SIZE + 8,
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
  
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  modernInputSafeArea: {
    backgroundColor: 'transparent',
  },
  modernInputMainContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  
  messageInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12, 
    maxWidth: '100%',
  },
  glassInputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    maxHeight: 120,
    position: 'relative',
    backdropFilter: 'blur(10px)',
    shadowColor: 'rgba(16, 185, 129, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'center',
  },
  glassTextInput: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '400',
    lineHeight: 22,
    textAlignVertical: 'center',
    minHeight: 24,
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
  
  modernSendBtn: {
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
  modernSendBtnActive: {
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
  sendButtonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});

export default ChatDetailScreen;