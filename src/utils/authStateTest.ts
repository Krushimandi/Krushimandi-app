/**
 * Auth State Test Utility
 * Helper to test and debug auth state transitions
 */

import { getAuthState, setAuthStep } from './authFlow';

export const testAuthStateTransition = async () => {
  
  // Get current state
  const currentState = await getAuthState();
  
  // Simulate completion
  if (currentState.currentStep !== 'complete') {
    await setAuthStep('Complete');
    
    // Check state after completion
    const newState = await getAuthState();
    
    return newState;
  }
  
  return currentState;
};
