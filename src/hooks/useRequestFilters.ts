/**
 * useRequestFilters Hook
 * Manages filtering logic for requests
 */
import { useMemo } from 'react';
import { 
  normalizeString, 
  formatLocation, 
  getDerivedStatus 
} from '../utils/requestUtils';

export interface FilterOption {
  key: string;
  label: string;
}

interface UseRequestFiltersOptions {
  requests: any[];
  searchQuery: string;
  selectedFilter: string;
  sortOption: string;
}

/**
 * Hook to filter and sort requests
 */
export const useRequestFilters = ({
  requests,
  searchQuery,
  selectedFilter,
  sortOption,
}: UseRequestFiltersOptions) => {
  const filteredAndSorted = useMemo(() => {
    if (!requests || requests.length === 0) return [];

    // Step 1: Apply status filter
    let filtered = requests;
    if (selectedFilter && selectedFilter !== 'all') {
      filtered = requests.filter(req => {
        const derivedStatus = getDerivedStatus(req.status);
        return derivedStatus === selectedFilter.toLowerCase();
      });
    }

    // Step 2: Apply search query
    if (searchQuery && searchQuery.trim()) {
      const searchLower = normalizeString(searchQuery);
      filtered = filtered.filter(req => {
        // Search in produce name
        if (normalizeString(req.produce).includes(searchLower)) return true;

        // Search in variety
        if (normalizeString(req.variety).includes(searchLower)) return true;

        // Search in location
        const locationStr = formatLocation(req.location, '');
        if (normalizeString(locationStr).includes(searchLower)) return true;

        // Search in status
        if (normalizeString(req.status).includes(searchLower)) return true;

        return false;
      });
    }

    // Step 3: Apply sorting
    const sorted = [...filtered];
    
    switch (sortOption) {
      case 'date_newest':
        sorted.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        break;

      case 'date_oldest':
        sorted.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateA - dateB;
        });
        break;

      case 'quantity_high':
        sorted.sort((a, b) => {
          const qtyA = Array.isArray(a.quantity) ? a.quantity[1] : a.quantity;
          const qtyB = Array.isArray(b.quantity) ? b.quantity[1] : b.quantity;
          return (Number(qtyB) || 0) - (Number(qtyA) || 0);
        });
        break;

      case 'quantity_low':
        sorted.sort((a, b) => {
          const qtyA = Array.isArray(a.quantity) ? a.quantity[0] : a.quantity;
          const qtyB = Array.isArray(b.quantity) ? b.quantity[0] : b.quantity;
          return (Number(qtyA) || 0) - (Number(qtyB) || 0);
        });
        break;

      case 'price_high':
        sorted.sort((a, b) => {
          const priceA = Number(a.price) || 0;
          const priceB = Number(b.price) || 0;
          return priceB - priceA;
        });
        break;

      case 'price_low':
        sorted.sort((a, b) => {
          const priceA = Number(a.price) || 0;
          const priceB = Number(b.price) || 0;
          return priceA - priceB;
        });
        break;

      default:
        // Default: newest first
        sorted.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
    }

    return sorted;
  }, [requests, searchQuery, selectedFilter, sortOption]);

  return {
    filteredRequests: filteredAndSorted,
    count: filteredAndSorted.length,
  };
};
