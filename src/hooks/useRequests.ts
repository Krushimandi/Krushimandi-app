/**
 * useRequests Hook
 * Custom hook for managing request operations with integrated notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { requestService } from '../services/requestService';
import { requestNotificationService } from '../services/requestNotificationService';
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
      
      if (requestId) {
        // Get the created request to access product snapshot and farmer details
        try {
          const createdRequest = await requestService.getRequest(requestId);
          if (createdRequest) {
            await requestNotificationService.sendRequestCreatedNotification({
              requestId,
              buyerId: user.uid,
              farmerId: createdRequest.farmerId,
              productName: createdRequest.productSnapshot.name,
              farmerName: createdRequest.productSnapshot.farmerName,
              buyerName: user.name || 'Unknown Buyer',
              price: createdRequest.productSnapshot.price,
              quantity: input.quantity
            });
          }
        } catch (notificationError) {
          console.error('❌ Failed to send request notification:', notificationError);
          // Don't fail the request creation if notification fails
        }
      }
      
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
  }, [user?.uid, user?.name]);

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
      
      // Send notification to buyer
      try {
        const request = await requestService.getRequest(input.requestId);
        if (request) {
          if (input.status === 'accepted') {
            await requestNotificationService.sendRequestAcceptedNotification({
              requestId: input.requestId,
              buyerId: request.buyerId,
              farmerId: user.uid,
              productName: request.productSnapshot.name,
              farmerName: user.name || 'Unknown Farmer',
              buyerName: request.buyerDetails.name,
              status: RequestStatus.ACCEPTED,
              price: input.proposedPrice || request.productSnapshot.price,
              quantity: request.quantity
            });
          } else {
            await requestNotificationService.sendRequestRejectedNotification({
              requestId: input.requestId,
              buyerId: request.buyerId,
              farmerId: user.uid,
              productName: request.productSnapshot.name,
              farmerName: user.name || 'Unknown Farmer',
              buyerName: request.buyerDetails.name,
              status: RequestStatus.REJECTED,
              price: request.productSnapshot.price,
              quantity: request.quantity,
              rejectionReason: input.message
            });
          }
        }
      } catch (notificationError) {
        console.error('❌ Failed to send response notification:', notificationError);
        // Don't fail the response if notification fails
      }
      
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
  }, [user?.uid, user?.name]);

  // Cancel a request (buyer action)
  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get request details before canceling for notification
      const request = await requestService.getRequest(requestId);
      
      await requestService.cancelRequest(user.uid, requestId);
      
      // Send notification to farmer
      if (request) {
        try {
          await requestNotificationService.sendRequestCancelledNotification({
            requestId,
            buyerId: user.uid,
            farmerId: request.farmerId,
            productName: request.productSnapshot.name,
            farmerName: request.productSnapshot.farmerName,
            buyerName: user.name || 'Unknown Buyer',
            status: RequestStatus.CANCELLED,
            price: request.productSnapshot.price,
            quantity: request.quantity
          });
        } catch (notificationError) {
          console.error('❌ Failed to send cancellation notification:', notificationError);
        }
      }
      
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
  }, [user?.uid, user?.name]);

  // Resend a request (buyer action)
  const resendRequest = useCallback(async (requestId: string): Promise<string | null> => {
    if (!user?.uid) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get original request details for notification
      const originalRequest = await requestService.getRequest(requestId);
      
      const newRequestId = await requestService.resendRequest(user.uid, requestId);
      
      // Send notification to farmer about resent request
      if (newRequestId && originalRequest) {
        try {
          await requestNotificationService.sendRequestResentNotification({
            requestId: newRequestId,
            buyerId: user.uid,
            farmerId: originalRequest.farmerId,
            productName: originalRequest.productSnapshot.name,
            farmerName: originalRequest.productSnapshot.farmerName,
            buyerName: user.name || 'Unknown Buyer',
            price: originalRequest.productSnapshot.price,
            quantity: originalRequest.quantity
          });
        } catch (notificationError) {
          console.error('❌ Failed to send resend notification:', notificationError);
        }
      }
      
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
  }, [user?.uid, user?.name]);

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

  // Check if buyer has existing request for a product
  const hasExistingRequest = useCallback(async (productId: string): Promise<boolean> => {
    if (!user?.uid) {
      return false;
    }

    try {
      return await requestService.hasExistingRequest(user.uid, productId);
    } catch (error) {
      console.error('Error checking existing request:', error);
      return false;
    }
  }, [user?.uid]);

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
    hasExistingRequest,
    clearError,
  };
};
