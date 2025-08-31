/**
 * Auth State Provider
 * Manages auth state and navigation flow after bootstrap
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../../config/firebase';
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
  const authStore = useAuthStore();

  // Listen to Firebase auth state changes
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth state listener');
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      console.log('🔥 Firebase auth state changed:', user ? `User logged in: ${user.uid}` : 'User logged out');
      setFirebaseUser(user);
      
      // If user is logged out in Firebase, ensure local state is also cleared
      if (!user) {
        console.log('🔥 Firebase user logged out, clearing local auth state');
        setUserRole(null);
        // Clear auth store
        authStore.logout();
      } else {
        console.log('🔥 Firebase user available, auth state should be preserved');
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
      const role = await getUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Error refreshing user role:', error);
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
    email: firebaseUser.email,
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

  console.log('🔍 AuthStateProvider context value:', {
    firebaseUser: !!firebaseUser,
    firebaseUid: firebaseUser?.uid,
    bootstrapAuth: bootstrapState.isAuthenticated,
    storeAuth: authStore.isAuthenticated,
    finalAuth: contextValue.isAuthenticated,
    userRole: contextValue.userRole,
    userObject: userObject,
    userHasUid: !!userObject?.uid,
    userHasRole: !!userObject?.role
  });

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
