# Unseen Orders Badge System - Complete Implementation

## 📋 Overview

This document describes the complete implementation of the offline-persistent unseen orders badge system for the Requests tab in the buyer's navigation.

## 🎯 Features

- ✅ **Offline Persistence**: Badge state is stored in AsyncStorage and survives app restarts
- ✅ **Real-time Updates**: Badge count updates automatically when new requests are accepted
- ✅ **Smart Tracking**: Only tracks newly accepted orders (not all accepted orders)
- ✅ **Auto-clear on View**: Badge clears with a 500ms delay when user views the Requests screen
- ✅ **Efficient**: No unnecessary re-renders or API calls
- ✅ **Debug Logging**: Comprehensive console logs for monitoring

## 🏗️ Architecture

### Components

1. **Badge Store** (`src/store/ordersBadgeStore.ts`)
   - Zustand store with AsyncStorage persistence
   - Tracks seen/unseen accepted orders
   - Provides reconciliation and marking methods

2. **RequestsScreen** (`src/components/home/RequestsScreen.jsx`)
   - Reconciles badge state when requests update
   - Marks orders as seen when screen is focused

3. **BuyerStack** (`src/navigation/buyer/BuyerStack.tsx`)
   - Displays badge count on Requests tab icon
   - Shows red notification badge with count

## 🔧 Implementation Details

### 1. Badge Store State

```typescript
interface OrdersBadgeState {
  initialized: boolean;           // Has the store been hydrated?
  knownAcceptedIds: string[];     // All accepted order IDs we know about
  unseenAcceptedIds: string[];    // Newly accepted order IDs not yet seen
  unseenCount: number;            // Derived: unseenAcceptedIds.length
}
```

### 2. Key Methods

#### `reconcileFromRequests(requests)`
Called whenever the requests array updates. Compares current accepted orders with the known list and adds new ones to the unseen list.

**Flow:**
1. Extract all accepted order IDs from requests
2. Compare with `knownAcceptedIds`
3. Add newly accepted IDs to `unseenAcceptedIds`
4. Remove IDs that are no longer accepted
5. Update counts

#### `markSeen(ids)`
Marks specific orders (or all) as seen, removing them from the unseen list.

**Usage:**
- `markSeen('all')` - Clear all unseen orders
- `markSeen(['id1', 'id2'])` - Mark specific orders as seen

### 3. Request Lifecycle

```
New Request Created (status: pending)
         ↓
Farmer Accepts Request (status: accepted)
         ↓
reconcileFromRequests() detects new accepted order
         ↓
unseenCount increases → Badge shows on Requests tab
         ↓
User opens Requests screen (useFocusEffect)
         ↓
markSeen() called after 500ms delay
         ↓
unseenCount decreases → Badge updates/hides
```

## 🔄 Data Flow

### On App Launch
1. AsyncStorage rehydrates the badge store
2. `unseenCount` is recalculated from persisted `unseenAcceptedIds`
3. Badge displays if `unseenCount > 0`

### When Requests Update
1. `useRequests` hook fetches/updates requests
2. RequestsScreen's `useEffect` calls `reconcileFromRequests(requests)`
3. Store compares new accepted orders with known list
4. New accepted orders added to unseen list
5. Badge count updates in real-time

### When User Views Requests
1. `useFocusEffect` triggers when screen gains focus
2. After 500ms delay, `markSeen(acceptedIds)` is called
3. All currently visible accepted orders marked as seen
4. Badge count decreases/hides

## 📱 UI Implementation

### Badge Display (BuyerStack.tsx)

```tsx
const unseenOrders = useOrdersBadgeStore(s => s.unseenCount);

// In Requests tab icon
{unseenOrders > 0 && (
  <View style={badgeStyles}>
    <Text>{unseenOrders > 99 ? '99+' : unseenOrders}</Text>
  </View>
)}
```

**Badge Styling:**
- Position: Absolute, top-right of icon
- Background: `#FF3B30` (iOS red)
- Border: 2px white border
- Text: White, bold, 10px
- Max display: "99+" for counts over 99

## 🐛 Debugging

### Console Logs

The implementation includes detailed console logging:

```
🔵 [OrdersBadge] Initial sync - Known accepted: 5
🟢 [OrdersBadge] New accepted orders detected: 2
📊 [OrdersBadge] State update - Unseen: 2 Known: 7
✅ [OrdersBadge] Marked seen: 2 Remaining unseen: 0
💾 [OrdersBadge] Rehydrated from storage - Unseen: 3
🔄 [OrdersBadge] Resetting state
❌ [OrdersBadge] Error in reconcileFromRequests: [error details]
```

### Monitoring Badge State

Use React DevTools or console to monitor:
```javascript
// Get current state
const state = useOrdersBadgeStore.getState();
console.log('Badge State:', state);

// Subscribe to changes
useOrdersBadgeStore.subscribe((state) => {
  console.log('Badge Updated:', state.unseenCount);
});
```

## 🧪 Testing Scenarios

### Scenario 1: New Accepted Order
1. Buyer creates a request (status: pending)
2. Farmer accepts the request
3. Buyer's app receives update
4. ✅ Badge shows "1" on Requests tab

### Scenario 2: Multiple Accepted Orders
1. Farmer accepts 3 requests while buyer is offline
2. Buyer opens app
3. ✅ Badge shows "3" on Requests tab

### Scenario 3: Viewing Requests
1. Badge shows "2"
2. User taps Requests tab
3. Waits 500ms
4. ✅ Badge disappears

### Scenario 4: App Restart
1. Badge shows "3"
2. User closes app completely
3. User reopens app
4. ✅ Badge still shows "3" (persisted)

### Scenario 5: Order Status Changes
1. Badge shows "2"
2. One accepted order is cancelled/rejected
3. ✅ Badge shows "1" (auto-cleanup)

## ⚠️ Important Notes

### Initialization Strategy
On first launch, the store initializes with all current accepted orders but **does NOT mark them as unseen**. This prevents showing a false badge for existing orders.

### 500ms Delay Rationale
The delay ensures:
1. User has time to notice the badge before it clears
2. Screen is fully loaded before marking as seen
3. Better UX - not too immediate, not too slow

### Status Matching
The system matches these statuses as "accepted":
- `accepted` (case-insensitive)

Derived "sold" statuses are tracked separately and don't trigger the badge.

## 🔐 Data Privacy

- **All data stored locally** in AsyncStorage
- No sensitive information persisted (only order IDs)
- Badge state is user-specific (not shared)
- Clears on logout/reset

## 🚀 Future Enhancements

Potential improvements:
1. Add sound/vibration when new order is accepted
2. Show preview of accepted order in notification
3. Batch mark-as-seen for performance
4. Add "Mark all as seen" button
5. Different badge colors for different order types
6. Push notification integration

## 📝 Code Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Badge Store | `src/store/ordersBadgeStore.ts` | State management |
| Badge Hook Usage | `src/components/home/RequestsScreen.jsx` | Reconciliation & marking |
| Badge Display | `src/navigation/buyer/BuyerStack.tsx` | UI rendering |
| Badge Export | `src/store/index.ts` | Export for imports |

## 🎨 Customization

### Change Badge Color
```tsx
// In BuyerStack.tsx, line ~87
backgroundColor: '#FF3B30', // Change to your color
```

### Change Delay Time
```tsx
// In RequestsScreen.jsx, line ~167
setTimeout(() => markSeen(acceptedIds), 500); // Change 500 to your value
```

### Change Max Count Display
```tsx
// In BuyerStack.tsx, line ~100
{unseenOrders > 99 ? '99+' : unseenOrders} // Change 99 to your value
```

## ✅ Checklist

- [x] Badge store created with persistence
- [x] Reconciliation logic implemented
- [x] Mark-as-seen logic implemented
- [x] Badge UI added to tab icon
- [x] Offline persistence working
- [x] Debug logging added
- [x] Edge cases handled (cancelled orders, etc.)
- [x] No infinite loops
- [x] No unnecessary re-renders
- [x] Works across app restarts

## 🎉 Result

The unseen orders badge system is now **fully functional** with:
- ✅ Real-time updates
- ✅ Offline persistence
- ✅ Smart tracking
- ✅ Clean UI
- ✅ Efficient performance
- ✅ Comprehensive debugging

---

**Last Updated:** October 3, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready
