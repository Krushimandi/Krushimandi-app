/**
 * Request Utilities
 * Helper functions for request data processing
 */

/**
 * Safely format location object to displayable string
 */
export const formatLocation = (
  location: any,
  fallback: string = 'Unknown Location'
): string => {
  if (!location) return fallback;
  
  if (typeof location === 'string') return location;
  
  if (typeof location === 'object') {
    const { city, district, state, formattedAddress } = location;
    const parts = [city, district, state]
      .filter(p => p && String(p).trim().length > 0);
    
    if (parts.length > 0) return parts.join(', ');
    if (formattedAddress && typeof formattedAddress === 'string') {
      return formattedAddress;
    }
    
    try {
      return JSON.stringify(location);
    } catch {
      return fallback;
    }
  }
  
  return String(location);
};

/**
 * Convert various timestamp formats to Date
 */
export const parseTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date(0);
  
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  }
  
  try {
    return new Date(timestamp);
  } catch {
    return new Date(0);
  }
};

/**
 * Format quantity for display
 */
export const formatQuantity = (
  quantity: any,
  unit: string = 'TON'
): string => {
  if (Array.isArray(quantity) && quantity.length === 2) {
    return `${quantity[0]}-${quantity[1]} ${unit}`;
  }
  return `${quantity} ${unit}`;
};

/**
 * Format price for display
 */
export const formatPrice = (
  price: number | null | undefined,
  unit: string = 'TON'
): string => {
  if (price == null) return 'Price not available';
  return `₹${price}/${unit}`;
};

/**
 * Get status color for UI
 */
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending': return '#F59E0B';
    case 'accepted': return '#10B981';
    case 'sold': return '#2563EB';
    case 'cancelled': return '#6B7280';
    case 'rejected': return '#EF4444';
    case 'expired': return '#9CA3AF';
    default: return '#6B7280';
  }
};

/**
 * Get status background color for UI
 */
export const getStatusBackground = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending': return '#FEF3C7';
    case 'accepted': return '#D1FAE5';
    case 'sold': return '#DBEAFE';
    case 'cancelled': return '#F3F4F6';
    case 'rejected': return '#FEE2E2';
    case 'expired': return '#F9FAFB';
    default: return '#F3F4F6';
  }
};

/**
 * Parse quantity to [min, max] pair for sorting
 */
export const parseQuantityPair = (quantity: any): [number, number] => {
  if (!quantity) return [0, 0];
  
  if (Array.isArray(quantity) && quantity.length === 2) {
    const min = Number(quantity[0]) || 0;
    const max = Number(quantity[1]) || 0;
    return [min, max];
  }
  
  const single = Number(quantity) || 0;
  return [single, single];
};

/**
 * Parse price from various formats
 */
export const parsePrice = (price: any): number => {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  
  if (typeof price === 'string') {
    const num = parseFloat(price.replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
};

/**
 * Normalize string for comparison
 */
export const normalizeString = (value: any): string => {
  return (value || '').toString().trim().toLowerCase();
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: dateYear !== currentYear ? 'numeric' : undefined,
  });
};

/**
 * Derive sold status from various completed states
 */
export const getSoldStatusSet = (): Set<string> => {
  return new Set(['delivered', 'completed', 'complete', 'sold', 'soldout']);
};

/**
 * Get derived status (maps sold variants to 'sold')
 */
export const getDerivedStatus = (status: string): string => {
  const rawStatus = (status || '').toLowerCase();
  return getSoldStatusSet().has(rawStatus) ? 'sold' : rawStatus;
};
