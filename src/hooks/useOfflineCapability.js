import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { isNetworkAvailable, initializeNetworkMonitoring } from '../services/firebaseService';

/**
 * Custom hook for handling offline/online states
 * Provides network status and offline capabilities
 */
export const useOfflineCapability = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const initializeNetworking = async () => {
      try {
        // Note: Network monitoring is already initialized in App.tsx
        // Just subscribe to network state changes for this hook
        unsubscribe = NetInfo.addEventListener(state => {
          const isConnected = state.isConnected && state.isInternetReachable;
          setIsOnline(isConnected);
          
          console.log(`📶 Network state: ${isConnected ? 'ONLINE' : 'OFFLINE'}`);
        });

        // Get initial network state
        const initialState = await NetInfo.fetch();
        setIsOnline(initialState.isConnected && initialState.isInternetReachable);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing network monitoring:', error);
        setIsInitialized(true); // Still mark as initialized to prevent endless loading
      }
    };

    initializeNetworking();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Check current network availability
   */
  const checkNetworkStatus = async () => {
    try {
      const isAvailable = await isNetworkAvailable();
      setIsOnline(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('❌ Error checking network status:', error);
      return false;
    }
  };

  /**
   * Execute operation with offline fallback
   * @param {Function} onlineOperation - Function to execute when online
   * @param {Function} offlineOperation - Function to execute when offline
   * @param {string} operationName - Name for logging
   */
  const executeWithOfflineFallback = async (onlineOperation, offlineOperation, operationName = 'operation') => {
    try {
      const networkAvailable = await checkNetworkStatus();
      
      if (networkAvailable && onlineOperation) {
        console.log(`🌐 Executing ${operationName} online`);
        return await onlineOperation();
      } else if (!networkAvailable && offlineOperation) {
        console.log(`📱 Executing ${operationName} offline`);
        return await offlineOperation();
      } else {
        throw new Error(`Cannot execute ${operationName}: ${networkAvailable ? 'no online operation provided' : 'no offline operation provided'}`);
      }
    } catch (error) {
      console.error(`❌ Error executing ${operationName}:`, error);
      
      // Try offline operation as fallback if online operation failed
      if (onlineOperation && offlineOperation && error.message?.toLowerCase().includes('network')) {
        console.log(`📱 Network error detected, falling back to offline ${operationName}`);
        try {
          return await offlineOperation();
        } catch (offlineError) {
          console.error(`❌ Offline fallback for ${operationName} also failed:`, offlineError);
          throw offlineError;
        }
      }
      
      throw error;
    }
  };

  return {
    isOnline,
    isInitialized,
    checkNetworkStatus,
    executeWithOfflineFallback
  };
};

export default useOfflineCapability;
