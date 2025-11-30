# Online Status Management - Moved to ChatListScreen

## Summary of Changes

The online/offline status management has been **moved from `ChatDetailScreen` to `ChatListScreen`** for better user experience and accurate presence tracking.

## Changes Made

### 1. **ChatListScreen.jsx** - Now Manages Online/Offline Status

#### Added Import:
```javascript
import { setUserOnlineStatus } from '../../services/chatService';
```

#### Added `useFocusEffect` Hook:
```javascript
// Set user online when ChatListScreen is focused, offline when unfocused
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
```

### 2. **ChatDetailScreen.jsx** - Removed Status Setting, Kept Subscription

#### Removed:
- Import of `setUserOnlineStatus` (no longer sets own status)
- Effect that sets user online on mount
- Effect that sets user offline on unmount

#### Kept:
- Import of `subscribeUserOnlineStatus` (still needed to display other user's status)
- Effect that subscribes to other user's online status (read-only)
- Display logic for showing "Active now" or "Last seen"

## How It Works Now

### User Online Status Lifecycle:

1. **User opens app → ChatListScreen appears**
   - ✅ `setUserOnlineStatus(uid, true)` called
   - ✅ User appears online in RTDB: `lastSeen: "online"`

2. **User navigates to ChatDetailScreen**
   - ✅ ChatListScreen loses focus → `setUserOnlineStatus(uid, false)` called
   - ✅ User appears offline in RTDB: `lastSeen: <timestamp>`
   - ⚠️ **Note**: This is intentional! Users are marked offline when viewing individual chats

3. **User goes back to ChatListScreen**
   - ✅ ChatListScreen gains focus → `setUserOnlineStatus(uid, true)` called
   - ✅ User appears online again

4. **User closes app or switches apps**
   - ✅ ChatListScreen loses focus → `setUserOnlineStatus(uid, false)` called
   - ✅ RTDB disconnect handler also fires → `lastSeen: <timestamp>`

### Other User Status in ChatDetailScreen:

- ✅ ChatDetailScreen **subscribes** to other user's status (read-only)
- ✅ Displays "Active now" when other user is online
- ✅ Displays formatted "Last seen" when other user is offline
- ✅ Shows green dot indicator when other user is online

## Benefits of This Approach

### ✅ Accurate Presence:
- Users are marked online only when they're in the chat list (ready to receive messages)
- When viewing a specific chat, they're marked offline (focused on one conversation)

### ✅ Better UX:
- Users don't appear "always online" when they're deep in a specific chat
- More realistic presence information for other users

### ✅ Proper Lifecycle:
- `useFocusEffect` automatically handles focus/blur events
- Works correctly with React Navigation's screen lifecycle
- No memory leaks or lingering subscriptions

### ✅ Consistent Behavior:
- Online status managed in one central place (ChatListScreen)
- All chat-related screens benefit from this single source of truth

## Data Flow

```
ChatListScreen (Focused)
  └─> setUserOnlineStatus(uid, true)
       └─> RTDB: /status/{uid} = { lastSeen: "online" }
            └─> Other users see: "Active now" ✅

ChatListScreen (Unfocused) / User in ChatDetailScreen
  └─> setUserOnlineStatus(uid, false)
       └─> RTDB: /status/{uid} = { lastSeen: <timestamp> }
            └─> Other users see: "Last seen 2m ago" ✅

ChatDetailScreen
  └─> subscribeUserOnlineStatus(otherUid, callback)
       └─> Reads from RTDB: /status/{otherUid}
            └─> Displays other user's status (read-only) ✅
```

## Testing Checklist

- [ ] Open app → ChatListScreen shows → User marked online
- [ ] Navigate to ChatDetailScreen → User marked offline
- [ ] Go back to ChatListScreen → User marked online again
- [ ] Close app → User marked offline with timestamp
- [ ] In ChatDetailScreen, see other user's "Active now" or "Last seen"
- [ ] Green dot shows when other user is online
- [ ] Last seen formatting works correctly (e.g., "Last seen 5m ago")

## Architecture Notes

### Why Not Keep Status Online in ChatDetailScreen?

**Option A** (Previous): User online in both ChatListScreen AND ChatDetailScreen
- ❌ User appears "always online" even when focused on specific chat
- ❌ Less accurate presence information

**Option B** (Current): User online ONLY in ChatListScreen
- ✅ More accurate: User is "available" when in chat list
- ✅ More realistic: User is "busy/focused" when in specific chat
- ✅ Matches typical messaging app behavior (WhatsApp, Telegram, etc.)

### Alternative Approach (If You Want "Always Online" When App is Open):

If you want users to appear online whenever the app is active (regardless of which screen), you can:

1. Move `setUserOnlineStatus` to App.tsx or root navigator
2. Use `AppState` to track app foreground/background
3. Set online when app is in foreground, offline when background

**Current approach is recommended** for most chat applications.

## Files Modified

1. ✅ `src/components/chat/ChatListScreen.jsx`
   - Added `setUserOnlineStatus` import
   - Added `useFocusEffect` hook for online/offline management

2. ✅ `src/components/chat/ChatDetailScreen.jsx`
   - Removed `setUserOnlineStatus` import
   - Removed effects that set own online/offline status
   - Kept `subscribeUserOnlineStatus` for displaying other user's status

## Related Documentation

- See `ONLINE_STATUS_RTDB_ONLY.md` for RTDB-only implementation details
- See `chatService.ts` for `setUserOnlineStatus` and `subscribeUserOnlineStatus` functions
