/**
 * Auth Bootstrap System
 * Handles complete authentication state initialization before app starts
 * Ensures Zustand hydration, Firebase auth, and user profile are ready
 */

import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { getCompleteUserProfile } from '../services/firebaseService';
import { getUserRole, syncUserRole, initializeUserRoleFromUserData } from './userRoleStorage';
import { StorageKeys } from '../constants';
import { authService } from '../services/authService';
import { persistentAuthManager } from './persistentAuthManager';

export interface AuthBootstrapState {
  isReady: boolean;
  isAuthenticated: boolean;
  user: any | null;
  userRole: 'farmer' | 'buyer' | null;
  token: string | null;
  error: string | null;
}

export interface AuthBootstrapOptions {
  maxWaitTime?: number; // Maximum time to wait for auth in ms
  enableDebugLogs?: boolean;
}

class AuthBootstrap {
  private isInitialized = false;
  private currentState: AuthBootstrapState = {
    isReady: false,
    isAuthenticated: false,
    user: null,
    userRole: null,
    token: null,
    error: null
  };

  /**
   * Initialize authentication state completely
   * This should be called during splash screen
   */
  async initialize(options: AuthBootstrapOptions = {}): Promise<AuthBootstrapState> {
    const { maxWaitTime = 10000, enableDebugLogs = __DEV__ } = options;
    
    if (this.isInitialized) {
      return this.currentState;
    }

    const log = enableDebugLogs ? console.log : () => {};
    
    try {
      log('🚀 Starting auth bootstrap...');
      
      // Step 0: Initialize persistent auth manager
      await persistentAuthManager.initialize();
      
      // Step 1: Wait for Zustand persist to hydrate
      await this.waitForZustandHydration(maxWaitTime, log);
      
      // Step 2: Initialize Firebase Auth and wait for state restoration
      await this.initializeFirebaseAuth(maxWaitTime, log);
      
      // Step 3: Validate and sync auth state
      const authState = await this.validateAndSyncAuthState(log);
      
      // Step 4: Load user profile and role if authenticated
      if (authState.isAuthenticated) {
        await this.loadUserProfileAndRole(log);
      }
      
      this.currentState.isReady = true;
      this.isInitialized = true;
      
      log('✅ Auth bootstrap completed:', this.currentState);
      return this.currentState;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bootstrap failed';
      log('❌ Auth bootstrap failed:', errorMessage);
      
      this.currentState = {
        isReady: true,
        isAuthenticated: false,
        user: null,
        userRole: null,
        token: null,
        error: errorMessage
      };
      
      this.isInitialized = true;
      return this.currentState;
    }
  }

  /**
   * Wait for Zustand persist to finish hydrating
   */
  private async waitForZustandHydration(maxWaitTime: number, log: Function): Promise<void> {
    log('⏳ Waiting for Zustand hydration...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Zustand hydration timeout'));
      }, maxWaitTime);

      // Check if store is already hydrated
      const checkHydration = () => {
        try {
          // Import dynamically to avoid issues
          const { useAuthStore } = require('../store/authStore');
          const authStore = useAuthStore.getState();
          
          // Zustand persist usually takes a few ms to hydrate
          // We'll check if we have any persisted data or if enough time has passed
          const hasPersistedData = authStore.isAuthenticated || authStore.user || authStore.token;
          
          if (hasPersistedData) {
            log('✅ Zustand hydration detected with data');
            clearTimeout(timeout);
            resolve();
          } else {
            // If no persisted data after 500ms, assume hydration is complete (no data to restore)
            setTimeout(() => {
              log('✅ Zustand hydration complete (no persisted data)');
              clearTimeout(timeout);
              resolve();
            }, 500);
          }
        } catch (error) {
          log('❌ Error checking Zustand hydration:', error);
          clearTimeout(timeout);
          resolve(); // Continue even if check fails
        }
      };

      // Start checking
      setTimeout(checkHydration, 100);
    });
  }

  /**
   * Initialize Firebase Auth and check current auth state
   */
  private async initializeFirebaseAuth(maxWaitTime: number, log: Function): Promise<void> {
    log('⏳ Initializing Firebase Auth...');
    
    try {
      const authState = await authService.initializeAuth();
      log('🔐 Firebase Auth initialized:', authState.isAuthenticated ? 'User authenticated' : 'No user');
      
      if (authState.isAuthenticated && authState.user) {
        log('🔐 Firebase user available:', authState.user.id);
      }
    } catch (error) {
      log('❌ Firebase Auth initialization failed:', error);
    }
  }
  private async waitForFirebaseAuth(maxWaitTime: number, log: Function): Promise<void> {
    log('⏳ Waiting for Firebase auth restoration...');
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          log('⚠️ Firebase auth restoration timeout');
          resolved = true;
          resolve();
        }
      }, maxWaitTime);

      // Check if user is already available (for immediate cases)
      const currentUser = auth().currentUser;
      if (currentUser) {
        log('🔐 Firebase user already available:', currentUser.uid);
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve();
        }
        return;
      }

      // Listen for auth state changes
      const unsubscribe = auth().onAuthStateChanged((user) => {
        if (!resolved) {
          log('🔐 Firebase auth state changed:', user ? `User: ${user.uid}` : 'No user');
          clearTimeout(timeout);
          unsubscribe();
          resolved = true;
          resolve();
        }
      });
      
      // Also set a minimum wait time to ensure Firebase has time to restore
      setTimeout(() => {
        if (!resolved) {
          const currentUser = auth().currentUser;
          log('🔐 Firebase auth check after wait:', currentUser ? `User: ${currentUser.uid}` : 'No user');
          clearTimeout(timeout);
          unsubscribe();
          resolved = true;
          resolve();
        }
      }, 1000); // Wait at least 1 second for Firebase to restore
    });
  }

  /**
   * Validate and sync auth state between Zustand and AsyncStorage
   */
  private async validateAndSyncAuthState(log: Function): Promise<{ isAuthenticated: boolean }> {
    log('🔄 Validating and syncing auth state...');
    
    // Import dynamically to avoid issues
    const { useAuthStore } = require('../store/authStore');
    const authStore = useAuthStore.getState();
    const firebaseUser = auth().currentUser;
    
    // Check AsyncStorage for additional auth data
    const userData = await AsyncStorage.getItem('userData');
    const authStep = await AsyncStorage.getItem('authStep');
    
    log('📊 Auth state components:', {
      zustandAuth: authStore.isAuthenticated,
      zustandUser: !!authStore.user,
      zustandToken: !!authStore.token,
      firebaseUser: !!firebaseUser,
      firebaseUID: firebaseUser?.uid,
      asyncStorageUserData: !!userData,
      authStep
    });

    // Determine final auth state
    let isAuthenticated = false;
    let finalUser = null;
    let finalToken = null;

    // Priority: Firebase User is the source of truth for authentication
    if (firebaseUser) {
      isAuthenticated = true;
      
      // Use Zustand user data if available, otherwise try AsyncStorage
      if (authStore.user) {
        finalUser = authStore.user;
        finalToken = authStore.token;
        log('✅ Auth state: Firebase user + Zustand data');
      } else if (userData) {
        try {
          finalUser = JSON.parse(userData);
          finalToken = authStore.token;
          log('✅ Auth state: Firebase user + AsyncStorage data');
        } catch (error) {
          log('⚠️ Failed to parse AsyncStorage userData');
          // We'll fetch user profile later
        }
      } else {
        log('✅ Auth state: Firebase user only (will fetch profile)');
      }
    } else {
      // No Firebase user - check if we have stale Zustand/AsyncStorage data
      if (authStore.isAuthenticated || (userData && authStep === 'Complete')) {
        log('⚠️ Found stale auth data without Firebase user - cleaning up');
        
        // Clear stale data
        authStore.logout();
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('authStep');
        
        isAuthenticated = false;
        finalUser = null;
        finalToken = null;
      } else {
        log('✅ No authentication data found - user is logged out');
      }
    }

    // Update current state
    this.currentState.isAuthenticated = isAuthenticated;
    this.currentState.user = finalUser;
    this.currentState.token = finalToken;

    // Sync Zustand store if needed
    if (isAuthenticated && (!authStore.isAuthenticated || !authStore.user)) {
      log('🔄 Syncing auth state to Zustand store');
      if (finalUser) {
        authStore.updateUser(finalUser);
      }
      // Only flag as authenticated without injecting a default role
      try {
        const { useAuthStore } = require('../store/authStore');
        useAuthStore.setState({ isAuthenticated: true });
      } catch (e) {
        log('⚠️ Failed to set auth flag on store:', e);
      }
    } else if (!isAuthenticated && authStore.isAuthenticated) {
      log('🔄 Clearing stale Zustand auth state');
      authStore.logout();
    }

    return { isAuthenticated };
  }

  /**
   * Load user profile and role
   */
  private async loadUserProfileAndRole(log: Function): Promise<void> {
    log('👤 Loading user profile and role...');
    
    try {
      // Try to get role from storage first (fastest)
      let userRole = await getUserRole();
      
      if (!userRole) {
        // Try to initialize from userData
        userRole = await initializeUserRoleFromUserData();
      }
      
      // If we have a Firebase user, try to load complete profile
      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        try {
          const userProfile = await getCompleteUserProfile();
          if (userProfile) {
            const profileRole = (userProfile as any).userRole;
            
            // Update auth store with complete profile
            const { useAuthStore } = require('../store/authStore');
            const authStore = useAuthStore.getState();
            authStore.updateUser({
              id: (userProfile as any).uid,
              firstName: (userProfile as any).firstName,
              lastName: (userProfile as any).lastName,
              email: (userProfile as any).email || '',
              phone: (userProfile as any).phoneNumber,
              userType: profileRole as 'farmer' | 'buyer',
              status: 'active',
              isVerified: (userProfile as any).isVerified || true,
              createdAt: (userProfile as any).createdAt,
              updatedAt: (userProfile as any).updatedAt,
              avatar: (userProfile as any).profileImage
            });
            
            // Sync role if needed
            if (profileRole && profileRole !== userRole) {
              await syncUserRole();
              userRole = profileRole;
            }
            
            this.currentState.user = userProfile;
            log('✅ Complete user profile loaded from Firestore');
          }
        } catch (profileError) {
          log('⚠️ Failed to load complete profile, using stored data:', profileError);
        }
      }
      
      this.currentState.userRole = userRole;
      log('✅ User role loaded:', userRole);
      
    } catch (error) {
      log('❌ Error loading user profile and role:', error);
      // Continue without failing - we can still show the app
    }
  }

  /**
   * Get current bootstrap state
   */
  getState(): AuthBootstrapState {
    return this.currentState;
  }

  /**
   * Check if bootstrap is ready
   */
  isReady(): boolean {
    return this.currentState.isReady;
  }

  /**
   * Reset bootstrap state (for testing or logout)
   */
  reset(): void {
    this.isInitialized = false;
    this.currentState = {
      isReady: false,
      isAuthenticated: false,
      user: null,
      userRole: null,
      token: null,
      error: null
    };
  }
}

// Export singleton instance
export const authBootstrap = new AuthBootstrap();
