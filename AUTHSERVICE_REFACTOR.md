# Enhanced AuthService Documentation

## Overview

The refactored `AuthService` provides a robust, type-safe authentication system with the following improvements:

## Key Features

### ✅ Type Safety
- Removed all unsafe non-null assertions (`!`)
- Added comprehensive type validation for API responses
- Safe optional chaining throughout

### ✅ Enhanced Security
- **Secure Token Storage**: Uses `react-native-keychain` for sensitive data
- **No Sensitive Logging**: Automatically sanitizes logs in production
- **Token Management**: Automatic refresh with configurable thresholds

### ✅ Firebase Integration
- **Custom Token Support**: Authenticates with Firebase using backend tokens
- **Dual Auth State**: Considers both Firebase and backend authentication
- **Timeout Protection**: Prevents memory leaks with timeout fallbacks

### ✅ Error Handling
- **Graceful Degradation**: Partial failures don't break the entire auth flow
- **Standardized Errors**: Consistent `AuthError` interface
- **Retry Logic**: Configurable retry attempts with exponential backoff

### ✅ API Consistency
- **Centralized Endpoints**: All endpoints use `API_ENDPOINTS` constants
- **Consistent Responses**: Standardized `AuthResponse` format

## Usage Examples

### Basic Login
```typescript
import { authService } from '../services/authService';

try {
  const result = await authService.login({
    phone: '+1234567890',
    password: 'securePassword'
  });
  
  console.log('Login successful:', result.user);
  // Tokens are automatically stored securely
} catch (error) {
  console.error('Login failed:', error.message);
  // Handle specific error types
  if (error.type === 'validation') {
    // Show validation error to user
  } else if (error.type === 'network') {
    // Show network error message
  }
}
```

### OTP Verification
```typescript
// Send OTP
await authService.sendOTP('+1234567890');

// Verify OTP
try {
  const result = await authService.verifyOTP({
    phone: '+1234567890',
    otp: '123456'
  });
  
  // User is now authenticated
  console.log('Verification successful:', result.user);
} catch (error) {
  if (error.type === 'validation') {
    // Invalid OTP format or missing data
  }
}
```

### Initialize Authentication
```typescript
const initResult = await authService.initializeAuth();

if (initResult.isAuthenticated) {
  console.log('User is authenticated:', initResult.user);
  console.log('Auth source:', initResult.source); // 'firebase', 'backend', 'cache'
} else {
  console.log('User needs to log in');
  if (initResult.error) {
    console.log('Initialization error:', initResult.error);
  }
}
```

### Configuration
```typescript
// Update configuration at runtime
authService.updateConfig({
  enableSecureStorage: true,
  maxRetries: 5,
  authTimeout: 15000
});

// Get current configuration
const config = authService.getConfig();
console.log('Current timeout:', config.authTimeout);
```

### Utility Methods
```typescript
// Check authentication status
const isAuth = await authService.isAuthenticated();

// Get current user
const user = await authService.getCurrentUser();

// Logout (comprehensive cleanup)
await authService.logout();
```

## Configuration Options

The service can be configured via `src/config/authConfig.ts`:

```typescript
export const authConfig: AuthServiceConfig = {
  enableFirebaseAuth: true,        // Enable Firebase integration
  enableSecureStorage: true,       // Use keychain for tokens
  tokenRefreshThreshold: 300000,   // 5 minutes before expiry
  authTimeout: 10000,              // 10 second timeout
  maxRetries: 3,                   // API retry attempts
  logSensitiveData: __DEV__,       // Only log in development
};
```

## Error Types

The service uses typed errors for better handling:

- `validation`: Input validation errors
- `network`: API/network related errors
- `auth`: Authentication/authorization errors
- `firebase`: Firebase-specific errors
- `storage`: Secure storage errors
- `unknown`: Unclassified errors

## Security Features

1. **Secure Storage**: Sensitive tokens stored in device keychain
2. **Log Sanitization**: Removes sensitive data from logs in production
3. **Token Validation**: Validates token expiry and format
4. **Firebase Integration**: Secure custom token authentication
5. **Comprehensive Logout**: Multi-layer cleanup prevents data leaks

## Migration Guide

### From Old AuthService

```typescript
// Old way (unsafe)
const authData = response.data.data!; // Non-null assertion
return authData;

// New way (safe)
if (!validateAuthResponse(response)) {
  throw this.createAuthError('Invalid authentication data', 'validation');
}
return response;
```

### Token Storage

```typescript
// Old way (insecure)
await AsyncStorage.setItem('authToken', token);

// New way (secure)
await this.storeAuthTokens({
  authToken: token,
  refreshToken: refreshToken,
  expiresAt: Date.now() + expiresIn * 1000
});
```

## Testing

The service supports configuration for testing environments:

```typescript
// In test setup
authService.updateConfig({
  enableSecureStorage: false,  // Use AsyncStorage in tests
  maxRetries: 1,              // Fail fast in tests
  authTimeout: 1000,          // Shorter timeout
  logSensitiveData: true      // Enable detailed logs
});
```
