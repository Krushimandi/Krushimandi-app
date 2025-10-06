/**
 * usePhoneNumbers Hook
 * Manages phone number fetching with caching for list items
 */
import { useEffect, useState } from 'react';
import { phoneService } from '../services/phoneService';

interface UsePhoneNumbersOptions {
  /** Auto-prefetch phone numbers for given farmer IDs */
  farmerIds?: string[];
  /** Enable/disable prefetching */
  prefetch?: boolean;
}

/**
 * Hook to manage phone number fetching for request lists
 */
export const usePhoneNumbers = (options: UsePhoneNumbersOptions = {}) => {
  const { farmerIds = [], prefetch = true } = options;
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({});
  const [loadingPhones, setLoadingPhones] = useState<Record<string, boolean>>({});
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string>>({});

  // Prefetch phone numbers on mount or when farmerIds change
  useEffect(() => {
    if (!prefetch || farmerIds.length === 0) return;

    const prefetchPhones = async () => {
      try {
        await phoneService.prefetchPhoneNumbers(farmerIds);
        // Phone numbers are now in the service cache
        // Individual getPhoneNumber calls will retrieve them
      } catch (error) {
        console.error('[usePhoneNumbers] Prefetch error:', error);
      }
    };

    prefetchPhones();
  }, [farmerIds, prefetch]);

  /**
   * Get phone number for a specific farmer
   */
  const getPhoneNumber = async (farmerId: string): Promise<string> => {
    // Return cached value if available
    if (phoneNumbers[farmerId]) {
      return phoneNumbers[farmerId];
    }

    // Return if already loading
    if (loadingPhones[farmerId]) {
      return '';
    }

    // Mark as loading
    setLoadingPhones(prev => ({ ...prev, [farmerId]: true }));

    try {
      const phone = await phoneService.getPhoneNumber(farmerId);
      
      if (phone) {
        // Update cache
        setPhoneNumbers(prev => ({ ...prev, [farmerId]: phone }));
        setPhoneErrors(prev => {
          const updated = { ...prev };
          delete updated[farmerId];
          return updated;
        });
      }
      
      return phone || '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load';
      setPhoneErrors(prev => ({ ...prev, [farmerId]: errorMessage }));
      return '';
    } finally {
      setLoadingPhones(prev => {
        const updated = { ...prev };
        delete updated[farmerId];
        return updated;
      });
    }
  };

  /**
   * Clear all cached phone numbers
   */
  const clearPhoneCache = () => {
    phoneService.clearCache();
    setPhoneNumbers({});
    setPhoneErrors({});
    setLoadingPhones({});
  };

  /**
   * Get phone number from current state (synchronous)
   */
  const getCachedPhone = (farmerId: string): string | null => {
    return phoneNumbers[farmerId] || null;
  };

  /**
   * Check if phone is currently loading
   */
  const isPhoneLoading = (farmerId: string): boolean => {
    return !!loadingPhones[farmerId];
  };

  /**
   * Get phone error for specific farmer
   */
  const getPhoneError = (farmerId: string): string | null => {
    return phoneErrors[farmerId] || null;
  };

  return {
    phoneNumbers,
    getPhoneNumber,
    getCachedPhone,
    isPhoneLoading,
    getPhoneError,
    clearPhoneCache,
  };
};
