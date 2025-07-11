/**
 * useRequests Hook
 * Custom hook for managing request operations
 */

import { useState, useEffect, useCallback } from 'react';
import { requestService } from '../services/requestService';
import { Request, RequestStatus, CreateRequestInput, RequestResponseInput, RequestFilters, ProductRequestCount } from '../types/Request';
import { useAuthState } from '../components/providers/AuthStateProvider';

export const useRequests = () => {
  const { user } = useAuthState();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new request
  const createRequest = useCallback(async (input: CreateRequestInput): Promise<string | null> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const requestId = await requestService.createRequest(user.uid, input);
      
      // Refresh requests after creating
      await loadBuyerRequests();
      
      return requestId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create request';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load buyer's requests
  const loadBuyerRequests = useCallback(async (filters?: RequestFilters): Promise<void> => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const buyerRequests = await requestService.getBuyerRequests(user.uid, filters);
      setRequests(buyerRequests);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load farmer's requests
  const loadFarmerRequests = useCallback(async (filters?: RequestFilters): Promise<void> => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const farmerRequests = await requestService.getFarmerRequests(user.uid, filters);
      setRequests(farmerRequests);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Respond to a request (farmer action)
  const respondToRequest = useCallback(async (input: RequestResponseInput): Promise<boolean> => {
    if (!user?.uid) {
      console.error('❌ No user UID for respond to request');
      setError('User not authenticated');
      return false;
    }

    try {
      console.log('🔄 useRequests: Responding to request:', {
        userId: user.uid,
        userRole: user.role,
        input
      });

      setLoading(true);
      setError(null);
      await requestService.respondToRequest(user.uid, input);
      
      console.log('✅ useRequests: Request response successful, refreshing farmer requests...');
      
      // Refresh requests after responding
      await loadFarmerRequests();
      
      console.log('✅ useRequests: Farmer requests refreshed');
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to request';
      console.error('❌ useRequests: Error responding to request:', {
        error: err,
        message: errorMessage
      });
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Cancel a request (buyer action)
  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      await requestService.cancelRequest(user.uid, requestId);
      
      // Refresh requests after canceling
      await loadBuyerRequests();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel request';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Resend a request (buyer action)
  const resendRequest = useCallback(async (requestId: string): Promise<string | null> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const newRequestId = await requestService.resendRequest(user.uid, requestId);
      
      // Refresh requests after resending
      await loadBuyerRequests();
      
      return newRequestId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend request';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Get product request counts
  const getProductRequestCounts = useCallback(async (productIds: string[]): Promise<ProductRequestCount[]> => {
    try {
      return await requestService.getProductRequestCounts(productIds);
    } catch (err) {
      console.error('Failed to get product request counts:', err);
      return [];
    }
  }, []);

  // Get statistics about requests
  const getRequestStats = useCallback(() => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      accepted: requests.filter(r => r.status === 'accepted').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      expired: requests.filter(r => r.status === 'expired').length,
    };
    return stats;
  }, [requests]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    requests,
    loading,
    error,
    createRequest,
    loadBuyerRequests,
    loadFarmerRequests,
    respondToRequest,
    cancelRequest,
    resendRequest,
    getProductRequestCounts,
    getRequestStats,
    clearError,
  };
};
