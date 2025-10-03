/**
 * Auth Bootstrap Test
 * Simple test to verify the bootstrap system works correctly
 */

import { authBootstrap } from '../src/utils/authBootstrap';

const testBootstrap = async () => {
  
  
  try {
    // Test bootstrap initialization
    const startTime = Date.now();
    const bootstrapState = await authBootstrap.initialize({
      maxWaitTime: 5000,
      enableDebugLogs: true,
    });
    const duration = Date.now() - startTime;
    const resultSummary = {
      isReady: bootstrapState.isReady,
      isAuthenticated: bootstrapState.isAuthenticated,
      userRole: bootstrapState.userRole,
      hasUser: !!bootstrapState.user,
      hasToken: !!bootstrapState.token,
      error: bootstrapState.error,
      duration,
    };
    void resultSummary;
    
    // Test reset functionality
    
    authBootstrap.reset();
    
  const isReadyAfterReset = authBootstrap.isReady();
  void isReadyAfterReset;
    
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
