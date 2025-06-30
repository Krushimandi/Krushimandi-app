/**
 * Auth State Provider
 * Manages auth state and navigation flow after bootstrap
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const authStore = useAuthStore();

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

  const contextValue: AuthStateContextType = {
    isAuthenticated: bootstrapState.isAuthenticated || authStore.isAuthenticated,
    userRole,
    user: authStore.user || bootstrapState.user,
    isLoading,
    error: bootstrapState.error,
    refreshUserRole,
  };

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
