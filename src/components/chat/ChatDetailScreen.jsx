import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ChatDetailScreen = ({ route, navigation }) => {
  const { chat } = route.params;
  const [messageText, setMessageText] = useState('');

  const messages = [
    {
      id: '1',
      type: 'text',
      content: 'Hey there, do you need any help?',
      sender: 'other',
      time: '09:32',
    },
    {
      id: '2',
      type: 'voice',
      content: 'Voice message',
      duration: '0:16',
      sender: 'other',
      time: '09:33',
    },
    {
      id: '3',
      type: 'image',
      content: require('../../assets/fruits/all.jpg'),
      sender: 'other',
      time: '09:34',
    },
    {
      id: '4',
      type: 'text',
      content: "Oh absolutely, I'd love to!",
      sender: 'me',
      time: '09:35',
    },
  ];

  const renderMessageItem = ({ item }) => {
    const isMe = item.sender === 'me';

    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {item.type === 'text' && (
            <>
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                {item.time}
              </Text>
            </>
          )}

          {item.type === 'voice' && (
            <View style={styles.voiceMessageContainer}>
              <TouchableOpacity style={styles.voicePlayButton}>
                <Icon name="play" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.voiceWaveform}>
                <View style={styles.waveformBar} />
                <View style={[styles.waveformBar, { height: 16 }]} />
                <View style={[styles.waveformBar, { height: 12 }]} />
                <View style={[styles.waveformBar, { height: 20 }]} />
                <View style={[styles.waveformBar, { height: 8 }]} />
                <View style={[styles.waveformBar, { height: 16 }]} />
              </View>
              <Text style={styles.voiceDuration}>{item.duration}</Text>
              <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                {item.time}
              </Text>
            </View>
          )}

          {item.type === 'image' && (
            <>
              <Image source={item.content} style={styles.messageImage} />
              <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                {item.time}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <Image source={chat.avatar} style={styles.headerAvatar} />
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{chat.name}</Text>
          <Text style={styles.headerStatus}>
            {chat.online ? 'Online' : 'Last seen recently'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Icon name="call" size={22} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Icon name="videocam" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        inverted={false}
      />

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.emojiBtn}>
          <Icon name="happy-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message"
            placeholderTextColor="#9CA3AF"
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity style={styles.attachBtn}>
            <Icon name="attach" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.sendButton}>
          <Icon 
            name={messageText.trim() ? "send" : "mic"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    padding: 8,
  },
  
  // Messages Styles
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  
  // Voice Message Styles
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  voicePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveformBar: {
    width: 3,
    height: 12,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 12,
  },
  
  // Image Message Styles
  messageImage: {
    width: 240,
    height: 180,
    borderRadius: 16,
    marginBottom: 8,
  },
  
  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  emojiBtn: {
    padding: 8,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
  },
  attachBtn: {
    padding: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default ChatDetailScreen;