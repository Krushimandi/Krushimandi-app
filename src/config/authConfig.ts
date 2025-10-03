/**
 * Authentication Configuration
 * Central place to configure AuthService behavior
 */

import { AuthServiceConfig } from '../types/auth';

export const authConfig: AuthServiceConfig = {
  // Enable/disable Firebase authentication integration
  enableFirebaseAuth: true,
  
  // Enable/disable secure storage for tokens (recommended for production)
  enableSecureStorage: true,
  
  // Time before token expiry to trigger automatic refresh (in milliseconds)
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
  
  // Maximum time to wait for auth initialization (in milliseconds)
  authTimeout: 10000, // 10 seconds
  
  // Maximum number of retries for failed API requests
  maxRetries: 3,
  
  // Whether to log sensitive data (should be false in production)
  logSensitiveData: __DEV__,
};

// Environment-specific overrides
if (!__DEV__) {
  // Production overrides
  authConfig.logSensitiveData = false;
  authConfig.maxRetries = 2;
  authConfig.authTimeout = 8000;
}
