/**
 * Auth State Manager
 * Simple event system to notify when auth state changes
 */

import { getAuthState, UserAuthState } from './authFlow';

type AuthStateListener = (authState: UserAuthState) => void;

class AuthStateManager {
  private listeners: AuthStateListener[] = [];
  private currentState: UserAuthState | null = null;

  /**
   * Add a listener for auth state changes
   */
  addListener(listener: AuthStateListener) {
    this.listeners.push(listener);
    
    // If we have a current state, immediately call the listener
    if (this.currentState) {
      listener(this.currentState);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(authState: UserAuthState) {
    this.currentState = authState;
    this.listeners.forEach(listener => {
      try {
        listener(authState);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Refresh auth state and notify listeners
   */
  async refreshAuthState() {
    try {
      const authState = await getAuthState();
      this.notifyListeners(authState);
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  }

  /**
   * Get current auth state (cached)
   */
  getCurrentState(): UserAuthState | null {
    return this.currentState;
  }
}

// Export singleton instance
export const authStateManager = new AuthStateManager();
