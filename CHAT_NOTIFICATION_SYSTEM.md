# Chat Notification System - Smart Batching Implementation

## 📱 Overview

This implementation adds intelligent chat notifications that:
1. ✅ **Only notify when recipient is offline** (app not open)
2. ✅ **Smart message batching** - Multiple messages = ONE notification for the last message
3. ✅ **Online/Offline status tracking** in Realtime Database and Firestore
4. ✅ **Automatic cleanup** when user comes online

---

## 🏗️ Architecture

### **1. Online/Offline Status Management**

#### **Storage Locations:**
- **Realtime Database**: `status/{uid}` - Real-time presence detection
- **Firestore**: `profiles/{uid}.isOnline` - Persistent status for queries

#### **Status Structure (RTDB):**
```json
{
  "status": {
    "user123": {
      "state": "online",
      "lastChanged": 1696800000000
    }
  }
}
```

#### **Profile Update (Firestore):**
```json
{
  "profiles/user123": {
    "isOnline": true,
    "lastSeen": "2025-10-01T10:30:00.000Z"
  }
}
```

### **2. Message Notification Flow**

```
User A sends message → Update chat with pendingNotification
                     ↓
         Firebase Function detects update
                     ↓
         Check if User B is online?
         ├─ YES → Clear pendingNotification, skip
         └─ NO  → Set 3-second timer
                     ↓
         User A sends another message?
         ├─ YES → Cancel old timer, set new timer (BATCHING)
         └─ NO  → Timer expires after 3s
                     ↓
         Send ONE notification for LAST message
                     ↓
         Clear pendingNotification metadata
```

### **3. Smart Batching Strategy**

**Problem**: User sends 5 messages rapidly → Recipient gets 5 notifications (annoying!)

**Solution**: 
- Each new message **cancels** previous notification timer
- Sets a new 3-second timer
- Only sends notification after user **stops typing** for 3 seconds
- Result: **ONE notification** with the last message text

**Example Timeline**:
```
t=0s:  User sends "Hey"           → Timer set (expires at t=3s)
t=1s:  User sends "How are you?"  → Cancel timer, new timer (expires at t=4s)
t=2s:  User sends "Call me back"  → Cancel timer, new timer (expires at t=5s)
t=5s:  Timer expires              → Send notification: "Call me back"
```

---

## 📂 Files Modified/Created

### **Frontend (React Native)**

#### `src/services/chatService.ts`
**Changes:**
1. ✅ Added `setUserOnlineStatus(uid, isOnline)` - Set user's online/offline state
2. ✅ Added `subscribeUserOnlineStatus(uid, callback)` - Listen to other user's status
3. ✅ Added `getUserOnlineStatus(uid)` - One-time status check
4. ✅ Updated `sendMessage()` - Now includes `pendingNotification` metadata

**Key Functions:**
```typescript
// Set current user online/offline
await setUserOnlineStatus(currentUid, true);

// Subscribe to other user's status
const unsub = subscribeUserOnlineStatus(otherUid, (isOnline, lastSeen) => {
  console.log(`User is ${isOnline ? 'online' : 'offline'}`);
});

// Check status once
const { isOnline, lastSeen } = await getUserOnlineStatus(otherUid);
```

#### `src/components/chat/ChatDetailScreen.jsx`
**Changes:**
1. ✅ Imports online status functions
2. ✅ Sets user online when entering chat
3. ✅ Sets user offline when leaving chat
4. ✅ Subscribes to other user's online status (updates green dot)

**Implementation:**
```javascript
// Set online on mount, offline on unmount
useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  setUserOnlineStatus(uid, true);
  return () => setUserOnlineStatus(uid, false);
}, []);

// Subscribe to other user's status
useEffect(() => {
  if (!otherUid) return;
  const unsub = subscribeUserOnlineStatus(otherUid, (isOnline, lastSeen) => {
    setContact(prev => ({ ...prev, online: isOnline }));
  });
  return () => unsub?.();
}, [otherUid]);
```

---

### **Backend (Firebase Functions)**

#### `firebase/functions/src/chatNotificationService.js` (NEW FILE)
**Purpose**: Smart notification system for chat messages

**Key Functions:**

1. **`isUserOnline(uid)`** - Checks RTDB `status/{uid}` for online state
2. **`getSenderProfile(uid)`** - Fetches sender's name/avatar from Firestore
3. **`sendChatNotification(chatId, recipientUid, senderUid, messageText)`** - Sends FCM push
4. **`onChatMessageUpdate`** - Firebase trigger on `/chats/{chatId}` updates
5. **`onUserStatusChange`** - Firebase trigger on `/status/{userId}` changes

**Notification Logic:**
```javascript
// Check if recipient is online
const recipientOnline = await isUserOnline(recipientUid);
if (recipientOnline) {
  console.log('Recipient is online, skipping notification');
  return { skipped: true, reason: 'recipient_online' };
}

// Recipient is offline → Send notification
await createNotificationAndPush({
  to: recipientUid,
  type: 'action',
  category: 'message',
  payload: {
    title: `💬 ${senderName}`,
    description: truncatedMessage,
    actionUrl: `chat/${chatId}`,
  },
});
```

**Batching Logic:**
```javascript
// Cancel previous timer if exists
if (pendingNotificationTimers.has(chatId)) {
  clearTimeout(pendingNotificationTimers.get(chatId));
}

// Set new 3-second timer
const timer = setTimeout(async () => {
  await sendChatNotification(chatId, recipientUid, senderUid, messageText);
}, 3000);

pendingNotificationTimers.set(chatId, timer);
```

**Auto-Cleanup on User Online:**
```javascript
exports.onUserStatusChange = onValueWritten('/status/{userId}', async (event) => {
  if (afterData.state === 'online') {
    // User came online → Clear all pending notifications for their chats
    const chatsSnapshot = await rtdb.ref('chats')
      .orderByChild('pendingNotification/forUser')
      .equalTo(userId)
      .once('value');
    
    // Cancel timers and remove pendingNotification metadata
  }
});
```

#### `firebase/functions/src/notificationService.js`
**Changes:**
1. ✅ Added `'message': 'transactionAlerts'` to category mapping
2. ✅ Chat messages now respect user's notification preferences

#### `firebase/functions/index.js`
**Changes:**
1. ✅ Imports `chatNotificationService`
2. ✅ Exports `onChatMessageUpdate` and `onUserStatusChange` functions
3. ✅ Updated health check with new function names

---

## 🔄 Data Flow

### **Sending a Message**

1. User A opens chat with User B
2. User A's status → `status/userA = { state: 'online' }`
3. User A sends message: "Hello"
4. `chatService.sendMessage()` updates:
   ```json
   {
     "chats/chat123": {
       "lastMessage": "Hello",
       "lastMessageBy": "userA",
       "updatedAt": 1696800000000,
       "pendingNotification": {
         "forUser": "userB",
         "senderUid": "userA",
         "lastMessageText": "Hello",
         "timestamp": 1696800000000
       }
     }
   }
   ```
5. Firebase Function `onChatMessageUpdate` triggers
6. Checks: Is User B online?
   - **YES** → Clear `pendingNotification`, exit
   - **NO** → Set 3-second timer
7. Timer expires → Send FCM push to User B
8. Clear `pendingNotification` after sending

### **Receiving a Message (Offline)**

1. User B's phone receives FCM push
2. Notification appears: "💬 User A: Hello"
3. User B taps notification
4. App opens to chat screen
5. `ChatDetailScreen` mounts → Sets User B online
6. `onUserStatusChange` detects User B is now online
7. Clears any remaining `pendingNotification` for User B's chats

---

## 📊 Database Schema

### **Realtime Database (RTDB)**

```json
{
  "status": {
    "user123": {
      "state": "online",
      "lastChanged": 1696800000000
    }
  },
  "chats": {
    "chat_abc_xyz": {
      "participants": ["abc", "xyz"],
      "lastMessage": "See you tomorrow!",
      "lastMessageBy": "abc",
      "updatedAt": 1696800000000,
      "pendingNotification": {
        "forUser": "xyz",
        "senderUid": "abc",
        "lastMessageText": "See you tomorrow!",
        "timestamp": 1696800000000
      },
      "unreadCount": {
        "abc": 0,
        "xyz": 3
      },
      "messages": {
        "-N1234": {
          "senderId": "abc",
          "text": "Hello",
          "createdAt": 1696799000000
        }
      }
    }
  }
}
```

### **Firestore**

```json
{
  "profiles/user123": {
    "displayName": "John Doe",
    "profileImage": "https://...",
    "phoneNumber": "+1234567890",
    "isOnline": true,
    "lastSeen": "2025-10-01T10:30:00.000Z",
    "fcmTokens": ["token1", "token2"],
    "notificationPreferences": {
      "transactionAlerts": true
    }
  },
  "notifications/notif123": {
    "to": "xyz",
    "type": "action",
    "category": "message",
    "payload": {
      "title": "💬 John Doe",
      "description": "See you tomorrow!",
      "actionUrl": "chat/chat_abc_xyz"
    },
    "seen": false,
    "createdAt": "..."
  }
}
```

---

## 🎯 Key Features

### **1. Online/Offline Detection**
- ✅ Uses RTDB `onDisconnect()` for instant detection
- ✅ Syncs to Firestore for persistent status
- ✅ Auto-clears on app close/crash

### **2. Smart Batching**
- ✅ 3-second debounce window
- ✅ Cancels previous timers on new messages
- ✅ Sends only ONE notification for last message
- ✅ In-memory timer map prevents duplicate timers

### **3. Auto-Cleanup**
- ✅ Clears `pendingNotification` after sending
- ✅ Clears pending notifications when user comes online
- ✅ Cancels timers when recipient opens chat

### **4. Preference Respect**
- ✅ Checks `notificationPreferences.transactionAlerts`
- ✅ Skips FCM if preference disabled
- ✅ Still creates in-app notification document

---

## 🧪 Testing Guide

### **Test Scenario 1: Single Message (Offline Recipient)**
1. User A logs in, User B stays logged out
2. User A sends: "Hello"
3. Wait 3 seconds
4. ✅ User B's phone receives notification: "💬 User A: Hello"

### **Test Scenario 2: Multiple Messages (Batching)**
1. User A logs in, User B stays logged out
2. User A sends:
   - "Hey" (t=0s)
   - "How are you?" (t=1s)
   - "Call me back" (t=2s)
3. Wait 3 seconds (timer expires at t=5s)
4. ✅ User B receives **ONE** notification: "💬 User A: Call me back"

### **Test Scenario 3: Recipient Online**
1. User A and User B both logged in
2. User A sends: "Hello"
3. Wait 3 seconds
4. ✅ **No notification sent** (User B is online)

### **Test Scenario 4: Recipient Comes Online**
1. User A sends 3 messages while User B offline
2. Timer set to expire in 3 seconds
3. User B opens app **before** timer expires (t=2s)
4. ✅ Timer cancelled, no notification sent
5. ✅ `pendingNotification` cleared

### **Test Scenario 5: Preference Disabled**
1. User B disables "Transaction Alerts" in notification settings
2. User A sends message while User B offline
3. ✅ No FCM push sent
4. ✅ In-app notification still created (visible when User B opens app)

---

## 🔧 Configuration

### **Notification Delay**
Adjust batching window in `chatNotificationService.js`:
```javascript
const NOTIFICATION_DELAY_MS = 3000; // 3 seconds (recommended)
```

### **Message Truncation**
Long messages are truncated in notifications:
```javascript
const truncatedMessage = messageText.length > 100 
  ? messageText.substring(0, 97) + '...' 
  : messageText;
```

### **Category Mapping**
Chat messages use `'message'` category → maps to `transactionAlerts` preference:
```javascript
const categoryMap = {
  'message': 'transactionAlerts',
  // ... other categories
};
```

---

## 🚀 Deployment

### **Deploy Firebase Functions**
```bash
cd d:\Projects\MyApp\firebase\functions
firebase deploy --only functions
```

### **Deploy Specific Functions**
```bash
firebase deploy --only functions:onChatMessageUpdate,functions:onUserStatusChange
```

### **Verify Deployment**
```bash
# Check function logs
firebase functions:log --only onChatMessageUpdate

# Test health check
curl https://asia-south1-<project-id>.cloudfunctions.net/healthCheck
```

---

## 📝 Firestore/RTDB Rules

### **Realtime Database Rules**
```json
{
  "rules": {
    "status": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && (root.child('chats/' + $chatId + '/participants').val().contains(auth.uid))",
        ".write": "auth != null && (root.child('chats/' + $chatId + '/participants').val().contains(auth.uid))",
        "pendingNotification": {
          ".write": "auth != null"
        }
      }
    }
  }
}
```

### **Firestore Rules**
```javascript
match /profiles/{userId} {
  allow read: if true; // Public profiles
  allow write: if request.auth != null && request.auth.uid == userId;
  
  // Allow functions to update isOnline
  allow update: if request.auth != null && 
                   (request.auth.uid == userId || 
                    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isOnline', 'lastSeen']));
}
```

---

## 🐛 Troubleshooting

### **Notifications not sending?**
1. Check Firebase Function logs: `firebase functions:log`
2. Verify FCM tokens exist: `profiles/{uid}.fcmTokens`
3. Confirm user is offline: Check `status/{uid}`
4. Ensure preference enabled: `profiles/{uid}.notificationPreferences.transactionAlerts`

### **Multiple notifications for one message?**
1. Check timer is being cancelled properly
2. Verify `pendingNotification` is cleared after send
3. Check `pendingNotificationTimers` map isn't leaking

### **User shows offline when online?**
1. Verify `setUserOnlineStatus()` called on mount
2. Check `onDisconnect()` handler is set
3. Confirm RTDB rules allow writes to `status/{uid}`

### **Timer not expiring?**
1. Cloud Functions have 60-second timeout by default
2. In-memory timers reset on function cold start (expected behavior)
3. Consider using Cloud Tasks for persistent timers (advanced)

---

## 📚 Resources

- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [FCM Push Notifications](https://firebase.google.com/docs/cloud-messaging)
- [Cloud Functions v2](https://firebase.google.com/docs/functions)
- [Presence Detection](https://firebase.google.com/docs/database/web/offline-capabilities#section-presence)

---

**Last Updated**: October 1, 2025
**Status**: ✅ Ready for Testing
**Next Steps**: Deploy functions and test notification flow
