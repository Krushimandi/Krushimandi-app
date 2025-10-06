# Notification Action URL Implementation

## Overview
Implemented smart navigation from notification detail screen based on `actionUrl` and user role.

## Implementation Details

### 1. **Action URL Parsing**
The system now parses different URL patterns from the `actionUrl` field:

#### Request URLs
- Pattern: `"request/ab9wvhr5I70mIvKxxJwi"` or `"/requests/ab9wvhr5I70mIvKxxJwi/"`
- Extracts requestId using regex: `/request[s]?\/([a-zA-Z0-9]+)/`

#### Order URLs
- Pattern: `"order/xyz123"` or `"/orders/xyz123/"`
- Extracts orderId using regex: `/order[s]?\/([a-zA-Z0-9]+)/`

#### Product URLs
- Pattern: `"product/abc456"` or `"/products/abc456/"`
- Extracts productId using regex: `/product[s]?\/([a-zA-Z0-9]+)/`

#### External URLs
- Pattern: URLs starting with `http://` or `https://`
- Opens in system browser using `Linking.openURL()`

### 2. **Role-Based Navigation**

#### For Request URLs:

**Buyer Role:**
- Navigates to: `Requests` screen
- Passes parameters:
  - `searchQuery`: The notification title (as product name)
  - `requestId`: Extracted request ID
- The Requests screen will use the search functionality to find and highlight the request

**Farmer Role:**
- Navigates to: `FarmerRequests` screen
- Passes parameters:
  - `requestId`: Extracted request ID
  - `filterBy`: Set to `'requestId'`
- The FarmerRequests screen can use existing filter to show the specific request card

### 3. **User Role Detection**
Uses Zustand auth store to get current user role:
```typescript
const { user } = useAuthStore();
const currentUserRole = user?.userType; // 'farmer' or 'buyer'
```

### 4. **Toast Notifications**
Shows informative toasts when navigating:
- "Opening request details..." when navigating to requests
- "Could not open the link" if external URL fails

### 5. **Fallback Behavior**
- If no actionUrl: Falls back to legacy type-based navigation
- If URL parsing fails: Goes back to previous screen
- If user role is undefined: Uses default navigation

## Files Modified

### 1. `NotificationDetail.tsx`
- Added imports: `useAuthStore`, `Toast`, `Linking`
- Added user role detection
- Replaced action button handler with smart URL parsing logic
- Added comprehensive URL pattern matching

### 2. Translation Files
Added new keys under `notificationsDetail.toast`:
- `navigatingToRequest`: "Opening request details..."
- `couldNotOpenLink`: "Could not open the link"

**Files updated:**
- `src/locales/en/translation.json`
- `src/locales/hi/translation.json` (Hindi)
- `src/locales/mr/translation.json` (Marathi)

## Usage Example

### Creating Notification with Action URL

```javascript
// For a farmer request notification to a buyer
{
  title: "New wheat request available",
  body: "A farmer requested 100 kg of wheat in your area",
  type: "request",
  actionUrl: "request/ab9wvhr5I70mIvKxxJwi" // Request ID
}

// For an order notification
{
  title: "Order Confirmed",
  body: "Your order #12345 has been confirmed",
  type: "transaction",
  actionUrl: "order/ORDER12345"
}

// For a product recommendation
{
  title: "Check out this product",
  body: "Fresh tomatoes available at great price",
  actionUrl: "product/PROD789"
}
```

## Navigation Flow

```
Notification Detail
    ↓
[Action Button Clicked]
    ↓
Parse actionUrl
    ↓
┌────────────────┐
│ Extract ID     │
│ & Type         │
└────────────────┘
    ↓
Check User Role
    ↓
┌─────────────────┴─────────────────┐
│                                   │
▼                                   ▼
Buyer                            Farmer
│                                   │
├→ Requests Screen                 ├→ FarmerRequests Screen
│  (with searchQuery)              │  (with requestId filter)
│                                   │
├→ Orders Screen                   ├→ Orders Screen
│                                   │
└→ Products Screen                 └→ Products Screen
```

## Testing Scenarios

### Test Case 1: Request URL - Buyer
- actionUrl: `"request/abc123"`
- User Role: `buyer`
- Expected: Navigate to Requests screen with search query
- Toast: "Opening request details..."

### Test Case 2: Request URL - Farmer
- actionUrl: `"/requests/abc123/"`
- User Role: `farmer`
- Expected: Navigate to FarmerRequests with requestId filter
- Toast: "Opening request details..."

### Test Case 3: Order URL
- actionUrl: `"order/ORD456"`
- Expected: Navigate to OrderDetail screen

### Test Case 4: External URL
- actionUrl: `"https://example.com/promotion"`
- Expected: Open in system browser

### Test Case 5: Invalid URL
- actionUrl: `"invalid-format"`
- Expected: Navigate back to previous screen

## Benefits

1. ✅ **Flexible URL Patterns**: Supports multiple URL formats
2. ✅ **Role-Aware Navigation**: Different screens for buyers and farmers
3. ✅ **Smart Parsing**: Regex-based ID extraction
4. ✅ **User Feedback**: Toast messages for navigation
5. ✅ **Backward Compatible**: Falls back to legacy type-based navigation
6. ✅ **External Links**: Handles http/https URLs
7. ✅ **Error Handling**: Graceful fallback on parsing errors

## Next Steps

### For Request Screen (Buyer)
Implement logic to:
1. Accept `searchQuery` and `requestId` params
2. Use search functionality to filter requests
3. Optionally highlight or scroll to the specific request

### For FarmerRequests Screen
Implement logic to:
1. Accept `requestId` and `filterBy` params
2. Apply filter to show only the specific request
3. Expand/highlight the matching request card

## Notes

- The notification title is used as the product name for buyer searches
- Request IDs are alphanumeric strings (e.g., `ab9wvhr5I70mIvKxxJwi`)
- The system is case-insensitive for URL matching
- All navigation includes proper error handling
