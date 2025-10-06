/**
 * Enhanced Auth Hook
 * Uses bootstrap state for reliable auth checks with offline support
 */

import { useAuthState } from '../components/providers/AuthStateProvider';
import { useAuthStore } from '../store/authStore';
import { useOfflineCapability } from './useOfflineCapability';
import { getOfflineAuthState, clearUserData } from '../services/firebaseService';
import { useEffect, useState } from 'react';

// Type for offline user data
interface OfflineUserData {
  uid: string;
  firstName: string;
  lastName: string;
  userRole: string;
  phoneNumber?: string;
  profileImage?: string;
  isOfflineAuth?: boolean;
  [key: string]: any;
}

export const useAuthBootstrap = () => {
  const authContext = useAuthState();
  const authStore = useAuthStore();
  const { isOnline, executeWithOfflineFallback } = useOfflineCapability();
  const [offlineUser, setOfflineUser] = useState<OfflineUserData | null>(null);

  // Load offline user data when offline
  useEffect(() => {
    const loadOfflineUser = async () => {
      if (!isOnline && !authContext.isAuthenticated) {
        try {
          const offlineAuth = await getOfflineAuthState();
          if (offlineAuth && (offlineAuth as any).isOfflineAuth) {
            setOfflineUser(offlineAuth as OfflineUserData);
            
          }
        } catch (error) {
          console.error('❌ Error loading offline user:', error);
        }
      } else {
        setOfflineUser(null);
      }
    };

    loadOfflineUser();
  }, [isOnline, authContext.isAuthenticated]);

  // Enhanced logout with offline handling
  const handleLogout = async () => {
    await executeWithOfflineFallback(
      // Online logout
      async () => {
        await clearUserData();
        try { authStore.setUser(null as any); } catch {}
      },
      // Offline logout (clear local data only)
      async () => {
        // Clear local storage; clearUserData internally handles signOut errors
        await clearUserData();
        try { authStore.setUser(null as any); } catch {}
      },
      'logout'
    );
  };

  // Determine effective auth state (considering offline mode)
  const effectiveUser = authContext.user || offlineUser;
  const effectiveIsAuthenticated = authContext.isAuthenticated || !!offlineUser;
  const effectiveUserRole = authContext.userRole || offlineUser?.userRole;

  return {
    // Primary auth state from bootstrap (enhanced with offline support)
    isAuthenticated: effectiveIsAuthenticated,
    userRole: effectiveUserRole,
    user: effectiveUser,
    isLoading: authContext.isLoading,
    error: authContext.error,
    
    // Network and offline state
    isOnline,
    isOffline: !isOnline,
    usingOfflineAuth: !!offlineUser,
    
  // Auth actions
    logout: handleLogout,
    updateUser: authStore.updateUser,
    executeWithOfflineFallback,
    
    // Helper functions
    refreshUserRole: authContext.refreshUserRole,
    
    // Combined state for components that need it
    isReady: !authContext.isLoading,
    canAccessApp: effectiveIsAuthenticated && effectiveUserRole,
    
    // Offline-specific helpers
    getOfflineUserData: () => offlineUser,
  };
};

export default useAuthBootstrap;
