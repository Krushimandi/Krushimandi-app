/**
 * Request Types and Schema
 * Defines the structure for buyer-farmer requests
 */

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Request status enumeration
export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface Request {
  id: string;
  buyerId: string;
  farmerId: string;
  productId: string;
  
  // Request details
  quantity: [number, number]; // [min, max] range in tons
  quantityUnit: string; // Default: 'ton'
  message?: string;
  
  // Status tracking
  status: RequestStatus;
  
  // Timestamps
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  expiresAt: FirebaseFirestoreTypes.Timestamp; // Auto-expire after 7 days
  
  // Response details (filled when farmer responds)
  farmerResponse?: {
    respondedAt: FirebaseFirestoreTypes.Timestamp;
    message?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    availableFrom?: string;
  };
  
  // Product snapshot (in case product gets deleted)
  productSnapshot: {
    name: string;
    price: number;
    priceUnit: string;
    category: string;
    farmerName: string;
    farmerLocation: string;
    imageUrl?: string;
  };
  
  // Buyer details
  buyerDetails: {
    name: string;
    phone: string;
    location: string;
  };
}

export interface RequestStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  cancelled: number;
  expired: number;
}

export interface ProductRequestCount {
  productId: string;
  count: number;
  lastRequestAt: string;
}

// Request creation input
export interface CreateRequestInput {
  productId: string;
  quantity: [number, number]; // [min, max] range in tons
  quantityUnit?: string; // Default: 'ton'
  message?: string;
}

// Request response input
export interface RequestResponseInput {
  requestId: string;
  status: 'accepted' | 'rejected';
  message?: string;
  proposedPrice?: number;
  proposedQuantity?: number;
  availableFrom?: string;
}

// Request filters
export interface RequestFilters {
  status?: string;
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}
