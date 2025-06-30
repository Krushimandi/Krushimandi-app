/**
 * Auth Bootstrap Test
 * Simple test to verify the bootstrap system works correctly
 */

import { authBootstrap } from '../src/utils/authBootstrap';

const testBootstrap = async () => {
  console.log('🧪 Testing Auth Bootstrap System...');
  
  try {
    // Test bootstrap initialization
    const startTime = Date.now();
    const bootstrapState = await authBootstrap.initialize({
      maxWaitTime: 5000,
      enableDebugLogs: true,
    });
    const duration = Date.now() - startTime;
    
    console.log('✅ Bootstrap completed in', duration, 'ms');
    console.log('📊 Final state:', {
      isReady: bootstrapState.isReady,
      isAuthenticated: bootstrapState.isAuthenticated,
      userRole: bootstrapState.userRole,
      hasUser: !!bootstrapState.user,
      hasToken: !!bootstrapState.token,
      error: bootstrapState.error
    });
    
    // Test reset functionality
    console.log('🔄 Testing reset...');
    authBootstrap.reset();
    
    const isReadyAfterReset = authBootstrap.isReady();
    console.log('✅ Reset successful, isReady:', isReadyAfterReset);
    
    console.log('🎉 Bootstrap system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Bootstrap test failed:', error);
  }
};

// Export for manual testing
export { testBootstrap };

// Auto-run if this file is executed directly
if (require.main === module) {
  testBootstrap();
}
