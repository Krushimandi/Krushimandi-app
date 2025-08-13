# Persistent Authentication Implementation

## Overview
This implementation ensures users remain logged in after successful OTP verification and prevents automatic logout due to network issues or temporary errors. Users will only be logged out for:

1. **Manual logout** - User explicitly chooses to log out
2. **Account blocked/disabled** - User account is blocked from Firebase Console
3. **Account deleted** - User account is deleted from Firebase Console
4. **Excessive consecutive failures** - After 5 consecutive authentication failures (safety measure)

## Key Features

### 1. Persistent Auth Manager (`src/utils/persistentAuthManager.ts`)
- Manages persistent login state after OTP verification
- Handles authentication errors intelligently
- Distinguishes between network errors and actual auth failures
- Implements failure counting with automatic recovery

### 2. Enhanced Auth Store (`src/store/authStore.ts`)
- Enables persistent login after successful OTP verification
- Uses persistent auth manager to determine logout decisions
- Maintains session during token refresh failures

### 3. Smart HTTP Interceptors (`src/services/httpInterceptors.ts`)
- No longer auto-logout on 401 errors if persistent login is enabled
- Handles token refresh failures gracefully
- Resets failure counts on successful operations

### 4. Enhanced Auth Service (`src/services/authService.ts`)
- Enables persistent login after OTP verification
- Disables persistent login on manual logout
- Integrated with persistent auth manager

### 5. Improved Firebase Service (`src/services/firebaseService.js`)
- Uses persistent auth manager for user validation decisions
- No longer clears auth data on network errors
- Maintains offline capability

## How It Works

### After OTP Verification
```typescript
// User successfully verifies OTP
await authService.verifyOTP({ phone, otp });
// ↓
// Persistent auth is automatically enabled
await persistentAuthManager.enablePersistentLogin(user.id);
```

### Error Handling Logic
```typescript
// Network error occurs
const authResult = await persistentAuthManager.handleAuthError(error, 'context');

if (authResult.shouldLogout) {
  // Only logout for serious issues (user blocked, deleted, etc.)
  performLogout();
} else {
  // Maintain session for network errors, temporary failures
  console.log('Maintaining session:', authResult.reason);
}
```

### Logout Conditions
The system will only logout users when:

1. **Manual Logout**:
   ```typescript
   authStore.logout(); // User clicked logout button
   ```

2. **Firebase Console Actions**:
   - User disabled: `auth/user-disabled`
   - User deleted: `auth/user-not-found`
   - Account suspended from admin console

3. **Excessive Failures**:
   - 5+ consecutive authentication failures
   - Indicates possible account compromise or serious issues

### What Won't Cause Logout
- Network connectivity issues
- Temporary server errors (5xx)
- Token refresh failures
- API timeouts
- Connection timeouts
- Firebase network errors

## Configuration

### Failure Threshold
```typescript
private readonly MAX_CONSECUTIVE_FAILURES = 5;
```

### Validation Interval
```typescript
private readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
```

## Storage
- Persistent auth state is stored in AsyncStorage
- User session data remains in secure storage
- Auth state survives app restarts

## Integration Points

### App Initialization (`App.tsx`)
```typescript
useEffect(() => {
  // Initialize persistent auth manager
  await persistentAuthManager.initialize();
}, []);
```

### Auth Bootstrap (`src/utils/authBootstrap.ts`)
```typescript
// Initialize during app bootstrap
await persistentAuthManager.initialize();
```

## Monitoring & Debugging

### Logging
All persistent auth operations are logged with the prefix `[PersistentAuth]`:
```
[PersistentAuth] ✅ Persistent login enabled for user: user123
[PersistentAuth] 🔒 Maintaining session despite auth error: network_error
[PersistentAuth] 🚪 Persistent auth determined logout required: user_blocked
```

### Status Check
```typescript
const status = persistentAuthManager.getAuthStatus();
console.log('Persistent Auth Status:', status);
```

## Security Considerations

1. **Failure Counting**: Prevents indefinite session persistence on repeated failures
2. **User Validation**: Regular validation checks ensure user account status
3. **Admin Control**: Respects Firebase Console user management actions
4. **Timeout Protection**: Validation has reasonable timeouts to prevent blocking

## Testing

### Test Scenarios
1. **OTP Verification → Persistent Login**: Verify persistent login is enabled after OTP success
2. **Network Error → Session Maintained**: Confirm user stays logged in during network issues
3. **Manual Logout → Session Cleared**: Ensure manual logout works correctly
4. **User Blocked → Auto Logout**: Verify blocked users are logged out
5. **Excessive Failures → Auto Logout**: Test failure threshold behavior

### Debug Commands
```typescript
// Check persistent auth status
persistentAuthManager.getAuthStatus();

// Validate persistent login
await persistentAuthManager.validatePersistentLogin();

// Reset failure count (for testing)
await persistentAuthManager.resetFailureCount();
```

## Migration Notes

### Existing Users
- Existing logged-in users will have persistent login enabled on their next successful operation
- No data migration required
- Backward compatible with existing auth flows

### Development
- All changes are backward compatible
- Development logging provides detailed error context
- Easy to disable for testing by setting `isPersistentLoginEnabled: false`

## Summary

This implementation provides a robust, user-friendly authentication experience that:
- ✅ Keeps users logged in after OTP verification
- ✅ Handles network issues gracefully
- ✅ Respects admin controls from Firebase Console
- ✅ Provides security through failure monitoring
- ✅ Maintains existing functionality
- ✅ Is fully backward compatible
