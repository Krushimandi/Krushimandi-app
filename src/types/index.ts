/**
 * Common Types for KrushiMandi App
 */

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  userType: 'farmer' | 'buyer' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  isVerified: boolean;
  dateOfBirth?: string;
  address?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string; // kg, quintal, ton, piece, etc.
  quantity: number;
  images: string[];
  qualityGrade?: string;
  harvestDate?: string;
  expiryDate?: string;
  farmerId: string;
  farmer: User;
  location: Address;
  isAvailable: boolean;
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyer: User;
  farmerId: string;
  farmer: User;
  products: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress: Address;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_update' | 'payment_success' | 'payment_failed' | 'profile_update' | 'promotional' | 'system';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  phone: string;
  password?: string;
  otp?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: 'farmer' | 'buyer';
  password: string;
  confirmPassword: string;
}

export interface OTPVerificationRequest {
  phone: string;
  otp: string;
}

// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  MobileScreen: undefined;
  OTPVerification: { phone?: string };
  RoleSelection: undefined;
  IntroduceYourself: { userRole?: string };
  PhotoUpload: undefined;
};

export type MainTabParamList = {
  AddFruit: undefined;
  EditProfile: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  ProductDetails: { productId: string };
  AddProduct: undefined;
  EditProduct: { productId: string };
  OrderDetails: { orderId: string };
  Notifications: undefined;
};

// State Management Types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  isOnboardingComplete: boolean;
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotional: boolean;
  system: boolean;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type Theme = 'light' | 'dark' | 'system';
