# Online Status & Last Seen - RTDB Only Implementation

## Overview
This implementation uses **Firebase Realtime Database ONLY** for storing and tracking user online status and last seen timestamps. No Firestore is used for this feature.

## Data Structure

### RTDB Path: `/status/{uid}`
```json
{
  "lastSeen": "online" | <timestamp>
}
```

### Logic:
- **User is ONLINE**: `lastSeen = "online"` (string)
- **User is OFFLINE**: `lastSeen = <timestamp>` (number in milliseconds)

## How It Works

### 1. When User Goes Online
```typescript
// RTDB /status/{uid}
{
  "lastSeen": "online"
}
```
- Sets `lastSeen` to the string `"online"`
- Configures disconnect handler to automatically update to timestamp on disconnect

### 2. When User Goes Offline
```typescript
// RTDB /status/{uid}
{
  "lastSeen": 1696356000000  // Unix timestamp in milliseconds
}
```
- Sets `lastSeen` to server timestamp
- Cancels disconnect handler

### 3. Reading Status
```typescript
const status = await database().ref(`status/${uid}`).once('value');
const lastSeen = status.val()?.lastSeen;

if (lastSeen === 'online') {
  // User is currently online
} else if (typeof lastSeen === 'number') {
  // User is offline, lastSeen is timestamp
  const lastSeenDate = new Date(lastSeen);
}
```

## Functions

### `setUserOnlineStatus(uid, isOnline)`
Sets user's online/offline status in RTDB.

**Parameters:**
- `uid`: User ID
- `isOnline`: `true` to set online, `false` to set offline

**Behavior:**
- **Online**: Sets `lastSeen = "online"` and configures disconnect handler
- **Offline**: Sets `lastSeen = <timestamp>`

### `subscribeUserOnlineStatus(uid, onChange)`
Real-time listener for user's online status.

**Parameters:**
- `uid`: User ID to monitor
- `onChange`: Callback `(isOnline: boolean, lastSeen?: string) => void`

**Returns:** Unsubscribe function

### `getUserOnlineStatus(uid)`
One-time check for user's current status.

**Parameters:**
- `uid`: User ID

**Returns:** `Promise<{ isOnline: boolean; lastSeen?: string }>`

## Database Security Rules

```json
{
  "rules": {
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid",
        ".validate": "newData.hasChildren(['lastSeen']) && (newData.child('lastSeen').isString() || newData.child('lastSeen').isNumber())"
      }
    }
  }
}
```

**Rules Explained:**
- ✅ **Read**: Any authenticated user can read any user's status
- ✅ **Write**: Users can only update their own status
- ✅ **Validate**: `lastSeen` must be either string ("online") or number (timestamp)

## Benefits

1. **Single Source of Truth**: All online/lastSeen data in one place (RTDB)
2. **Real-time Updates**: Instant notifications when users go online/offline
3. **Automatic Disconnect**: RTDB's disconnect handlers ensure accurate offline timestamps
4. **Simple Data Model**: One field (`lastSeen`) handles both online status and last seen time
5. **Cost Effective**: RTDB is cheaper for frequent read/write operations
6. **No Firestore Dependency**: Completely independent of Firestore for this feature

## Usage in UI

```typescript
// Subscribe to user's status
const unsubscribe = subscribeUserOnlineStatus(userId, (isOnline, lastSeen) => {
  if (isOnline) {
    console.log('User is online now');
  } else {
    console.log(`User was last seen: ${formatLastSeen(lastSeen)}`);
  }
});

// Set your own status
setUserOnlineStatus(myUserId, true);  // I'm online
setUserOnlineStatus(myUserId, false); // I'm going offline
```

## Deployment

After making these changes, deploy the database rules:

```bash
firebase deploy --only database
```

## Migration Notes

If you have existing data in Firestore's `profiles/{uid}` with `isOnline` or `lastSeen` fields, you may want to:

1. Keep Firestore data for other purposes (user profiles, etc.)
2. Use RTDB exclusively for online/lastSeen status
3. Optionally sync RTDB → Firestore using Cloud Functions (if needed for queries)

## Testing

1. **User A goes online**:
   - Check `/status/{userA}/lastSeen` should be `"online"`

2. **User A closes app**:
   - Check `/status/{userA}/lastSeen` should be a timestamp

3. **User B subscribes to User A's status**:
   - Should see real-time updates when User A goes online/offline

4. **Check permissions**:
   - User A cannot write to `/status/{userB}`
   - All authenticated users can read `/status/{userA}`
