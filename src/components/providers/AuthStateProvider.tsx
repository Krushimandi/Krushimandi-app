/**
 * Auth State Provider
 * Manages auth state and navigation flow after bootstrap
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Use unified modular firebase exports (replaces legacy namespace config)
import { auth } from '../../config/firebaseModular';
import { AuthBootstrapState } from '../../utils/authBootstrap';
import { useAuthStore } from '../../store/authStore';
import { getUserRole } from '../../utils/userRoleStorage';

interface AuthStateContextType {
  isAuthenticated: boolean;
  userRole: 'farmer' | 'buyer' | null;
  user: any | null;
  isLoading: boolean;
  error: string | null;
  refreshUserRole: () => Promise<void>;
}

const AuthStateContext = createContext<AuthStateContextType | undefined>(undefined);

interface AuthStateProviderProps {
  children: React.ReactNode;
  bootstrapState: AuthBootstrapState;
}

export const AuthStateProvider: React.FC<AuthStateProviderProps> = ({
  children,
  bootstrapState,
}) => {
  const [userRole, setUserRole] = useState<'farmer' | 'buyer' | null>(bootstrapState.userRole);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const previousUidRef = useRef<string | null>(auth.currentUser?.uid || null);
  const switchingRef = useRef(false);
  const authStore = useAuthStore();

  // Listen to Firebase auth state changes
  useEffect(() => {
    
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      
      setFirebaseUser(user);
      const prevUid = previousUidRef.current;
      const newUid = user?.uid || null;

      // Detect account switch (prev user exists and new user different)
      if (prevUid && newUid && prevUid !== newUid) {
        if (switchingRef.current) return; // prevent re-entrancy
        switchingRef.current = true;
        
        try {
          // Clear user-specific cached data WITHOUT full logout side-effects
          const keysToRemove = [
            'userData',
            'authStep',
            'user_role',
            '@krushimandi:user_role',
            '@krushimandi:user_data',
            '@krushimandi:auth_flow_state'
          ];
          try {
            await AsyncStorage.multiRemove(keysToRemove);
          } catch (cacheErr) {
            console.warn('⚠️ Failed removing some cache keys:', cacheErr);
          }

          // Reset auth store user (keep isAuthenticated true since Firebase has a user)
          authStore.setUser(null);

          // Force reload of new Firebase user to ensure displayName, photoURL fresh
          try {
            await user.reload();
            // Update store user profile fields if present
            try {
              authStore.updateUser({
                displayName: user.displayName ?? undefined,
                phoneNumber: user.phoneNumber ?? undefined,
              } as any);
            } catch {}
          } catch (reloadErr) {
            console.warn('⚠️ Failed to reload new user after switch:', reloadErr);
          }

          // Attempt to load new profile via authFlowManager if available (lazy import to avoid cycle)
          try {
            const { authFlowManager } = await import('../../services/authFlowManager');
            await authFlowManager.loadUserProfile(newUid);
          } catch (profileErr) {
            console.warn('⚠️ Failed loading new user profile post-switch:', profileErr);
          }

          // Refresh role from storage or profile
          await refreshUserRole();
        } finally {
          previousUidRef.current = newUid;
          switchingRef.current = false;
        }
      } else if (!prevUid && newUid) {
        // First login this session — set baseline prevUid
        previousUidRef.current = newUid;
      }
      
      // If user is logged out in Firebase, ensure local state is also cleared
      if (!user) {
        
        setUserRole(null);
        // Clear auth store
        authStore.setUser(null);
        previousUidRef.current = null;
      } else {
        // Firebase user available; preserve auth state
      }
    });

    return unsubscribe;
  }, []);

  // Sync with bootstrap state
  useEffect(() => {
    if (bootstrapState.userRole !== userRole) {
      setUserRole(bootstrapState.userRole);
    }
  }, [bootstrapState.userRole]);

  // Listen to auth store changes
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state: any) => {
      if (state.user?.userType && state.user.userType !== userRole) {
        const roleType = state.user.userType as 'farmer' | 'buyer';
        if (roleType === 'farmer' || roleType === 'buyer') {
          setUserRole(roleType);
        }
      }
    });

    return unsubscribe;
  }, [userRole]);

  const refreshUserRole = async () => {
    try {
      setIsLoading(true);
      
      // First try to get role from AsyncStorage
      let role = await getUserRole();
      
      // If no role in AsyncStorage, try to get from user profile
      if (!role && firebaseUser) {
        try {
          const { getCompleteUserProfile } = await import('../../services/firebaseService');
          const userProfile = await getCompleteUserProfile(true) as any; // Force refresh
          
          if (userProfile?.userRole) {
            role = userProfile.userRole;
            // Save the role locally for future use
            const { saveUserRole } = await import('../../utils/userRoleStorage');
            await saveUserRole(role as 'farmer' | 'buyer');
          }
        } catch (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
        }
      }
      
      setUserRole(role);
    } catch (error) {
      console.error('❌ Error refreshing user role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a proper user object with uid and role
  const userObject = firebaseUser ? {
    ...authStore.user,
    ...bootstrapState.user,
    uid: firebaseUser.uid,
    role: userRole,
    displayName: firebaseUser.displayName,
  } : null;

  const contextValue: AuthStateContextType = {
  // Use Firebase auth state as the primary source of truth
  // If a Firebase user exists, consider the user authenticated regardless of local store flags.
  // Fallback to bootstrap/store flags only when Firebase user isn't available (offline/rehydration scenarios).
  isAuthenticated: !!firebaseUser || bootstrapState.isAuthenticated || authStore.isAuthenticated,
    userRole,
    user: userObject,
    isLoading,
    error: bootstrapState.error,
    refreshUserRole,
  };

  // Debug logs removed

  return (
    <AuthStateContext.Provider value={contextValue}>
      {children}
    </AuthStateContext.Provider>
  );
};

export const useAuthState = (): AuthStateContextType => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
};
