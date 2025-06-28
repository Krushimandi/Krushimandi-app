/**
 * Auth State Test Utility
 * Helper to test and debug auth state transitions
 */

import { getAuthState, setAuthStep } from './authFlow';

export const testAuthStateTransition = async () => {
  console.log('🧪 Testing auth state transition...');
  
  // Get current state
  const currentState = await getAuthState();
  console.log('📊 Current auth state:', currentState);
  
  // Simulate completion
  if (currentState.currentStep !== 'complete') {
    console.log('⚡ Simulating auth completion...');
    await setAuthStep('Complete');
    
    // Check state after completion
    const newState = await getAuthState();
    console.log('📊 New auth state after completion:', newState);
    
    return newState;
  }
  
  return currentState;
};
