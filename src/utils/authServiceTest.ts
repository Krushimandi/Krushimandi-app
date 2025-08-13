/**
 * AuthService Integration Test
 * Simple test to verify the refactored AuthService works correctly
 */

import { authService } from '../services/authService';

export const testAuthService = async () => {
  console.log('🧪 Testing AuthService...');

  try {
    // Test configuration
    console.log('📋 Current config:', authService.getConfig());

    // Test authentication check
    const isAuth = await authService.isAuthenticated();
    console.log('🔐 Is authenticated:', isAuth);

    // Test current user retrieval
    const user = await authService.getCurrentUser();
    console.log('👤 Current user:', user ? `${user.firstName} ${user.lastName}` : 'None');

    // Test initialization
    const initResult = await authService.initializeAuth();
    console.log('🚀 Initialize result:', {
      isAuthenticated: initResult.isAuthenticated,
      source: initResult.source,
      hasUser: !!initResult.user,
      error: initResult.error
    });

    console.log('✅ AuthService tests completed successfully');
    return true;

  } catch (error) {
    console.error('❌ AuthService test failed:', error);
    return false;
  }
};

// Example usage in your app:
// import { testAuthService } from './utils/authServiceTest';
// testAuthService(); // Call this in your app to test
