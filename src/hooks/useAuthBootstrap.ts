/**
 * Enhanced Auth Hook
 * Uses bootstrap state for reliable auth checks
 */

import { useAuthState } from '../components/providers/AuthStateProvider';
import { useAuthStore } from '../store/authStore';

export const useAuthBootstrap = () => {
  const authContext = useAuthState();
  const authStore = useAuthStore();

  return {
    // Primary auth state from bootstrap
    isAuthenticated: authContext.isAuthenticated,
    userRole: authContext.userRole,
    user: authContext.user,
    isLoading: authContext.isLoading,
    error: authContext.error,
    
    // Auth store functions
    login: authStore.login,
    logout: authStore.logout,
    updateUser: authStore.updateUser,
    
    // Helper functions
    refreshUserRole: authContext.refreshUserRole,
    
    // Combined state for components that need it
    isReady: !authContext.isLoading,
    canAccessApp: authContext.isAuthenticated && authContext.userRole,
  };
};

export default useAuthBootstrap;
