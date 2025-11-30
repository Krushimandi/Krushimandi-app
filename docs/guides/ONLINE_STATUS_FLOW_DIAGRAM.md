# Online Status Flow Diagram

## Visual Flow Chart

```
┌─────────────────────────────────────────────────────────────────┐
│                      APP OPENED                                  │
│                    ChatListScreen                                │
│                                                                   │
│  useFocusEffect Triggers:                                        │
│  ✅ setUserOnlineStatus(uid, true)                              │
│  ↓                                                               │
│  RTDB: /status/{uid}                                            │
│  {                                                               │
│    lastSeen: "online"  ← User appears ONLINE                    │
│  }                                                               │
│                                                                   │
│  Other users see: "Active now" 🟢                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User taps on a chat
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  NAVIGATED TO ChatDetailScreen                   │
│                                                                   │
│  ChatListScreen loses focus                                      │
│  useFocusEffect cleanup triggers:                               │
│  ✅ setUserOnlineStatus(uid, false)                             │
│  ↓                                                               │
│  RTDB: /status/{uid}                                            │
│  {                                                               │
│    lastSeen: 1696356000000  ← Timestamp (User OFFLINE)         │
│  }                                                               │
│                                                                   │
│  Other users see: "Last seen 2m ago" ⚪                         │
│                                                                   │
│  Meanwhile in ChatDetailScreen:                                 │
│  ✅ subscribeUserOnlineStatus(otherUid, callback)               │
│     - Reads OTHER user's status from RTDB                       │
│     - Displays "Active now" or "Last seen X ago"                │
│     - Shows green dot 🟢 if other user online                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User presses back
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACK TO ChatListScreen                          │
│                                                                   │
│  ChatListScreen gains focus again                               │
│  useFocusEffect triggers:                                       │
│  ✅ setUserOnlineStatus(uid, true)                              │
│  ↓                                                               │
│  RTDB: /status/{uid}                                            │
│  {                                                               │
│    lastSeen: "online"  ← User appears ONLINE again              │
│  }                                                               │
│                                                                   │
│  Other users see: "Active now" 🟢                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User closes app
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      APP CLOSED                                  │
│                                                                   │
│  ChatListScreen unmounts / loses focus                          │
│  useFocusEffect cleanup triggers:                               │
│  ✅ setUserOnlineStatus(uid, false)                             │
│  ✅ RTDB onDisconnect() handler also fires                      │
│  ↓                                                               │
│  RTDB: /status/{uid}                                            │
│  {                                                               │
│    lastSeen: 1696357200000  ← Final timestamp                  │
│  }                                                               │
│                                                                   │
│  Other users see: "Last seen 5m ago" ⚪                         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Points

### 🟢 User Appears ONLINE:
- ✅ When in **ChatListScreen** (focused)
- ✅ Ready to receive messages
- ✅ Available for chat

### ⚪ User Appears OFFLINE:
- ✅ When in **ChatDetailScreen** (focused on one conversation)
- ✅ When app is closed
- ✅ When app is backgrounded
- ✅ Shows last seen timestamp

## Component Responsibilities

```
┌────────────────────────────┐
│     ChatListScreen         │
│  (Main Chat Hub)           │
│                            │
│  📝 Responsibilities:      │
│  • Set user ONLINE         │
│  • Set user OFFLINE        │
│  • Manage own status       │
│                            │
│  🎯 Uses:                  │
│  • setUserOnlineStatus()   │
└────────────────────────────┘

┌────────────────────────────┐
│    ChatDetailScreen        │
│  (Individual Chat)         │
│                            │
│  📝 Responsibilities:      │
│  • Display OTHER user      │
│    online status           │
│  • Show "Active now"       │
│  • Show "Last seen"        │
│                            │
│  🎯 Uses:                  │
│  • subscribeUserOnline     │
│    Status()                │
│  • (READ-ONLY)             │
└────────────────────────────┘
```

## State Transitions

```
State Machine for User's Online Status:

        App Opens
           ↓
    [ChatListScreen]
           ↓
        ONLINE 🟢
           ↓
    ┌──────┴──────┐
    │             │
Navigate     Close App
to Chat         ↓
    ↓        OFFLINE ⚪
    │      (with timestamp)
[ChatDetail]
    ↓
OFFLINE ⚪
(with timestamp)
    ↓
Go Back
    ↓
[ChatListScreen]
    ↓
ONLINE 🟢
```

## Data in RTDB

### When User is ONLINE:
```json
{
  "status": {
    "user123": {
      "lastSeen": "online"
    }
  }
}
```

### When User is OFFLINE:
```json
{
  "status": {
    "user123": {
      "lastSeen": 1696356000000
    }
  }
}
```

## Benefits

1. **Battery Efficient** ⚡
   - Status only updates on screen transitions
   - No constant polling or updates

2. **Accurate Presence** 🎯
   - Users marked online only when truly available
   - Realistic "last seen" timestamps

3. **Clean Architecture** 🏗️
   - Single source of truth (ChatListScreen)
   - Read-only subscriptions (ChatDetailScreen)
   - No circular dependencies

4. **Good UX** 😊
   - Other users know when you're available
   - "Active now" when in chat list
   - "Last seen" shows exact time when offline

5. **Automatic Cleanup** 🧹
   - `useFocusEffect` handles mount/unmount
   - RTDB disconnect handlers ensure cleanup
   - No memory leaks
