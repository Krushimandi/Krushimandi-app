/**
 * Enhanced types for AuthService
 */

import { User, ApiResponse } from './index';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  customFirebaseToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthInitializationResult {
  isAuthenticated: boolean;
  user: User | null;
  source: 'firebase' | 'backend' | 'cache' | 'none';
  error?: string;
}

export interface SecureTokens {
  authToken: string;
  refreshToken?: string;
  firebaseToken?: string;
  expiresAt?: number;
}

export interface LoginCredentials {
  phone: string;
  password?: string;
  otp?: string;
}

export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL?: string | null;
  providerId?: string;
}

export interface AuthError extends Error {
  code?: string;
  type: 'network' | 'auth' | 'validation' | 'firebase' | 'storage' | 'unknown';
  details?: Record<string, unknown>;
}

export interface AuthServiceConfig {
  enableFirebaseAuth: boolean;
  enableSecureStorage: boolean;
  tokenRefreshThreshold: number; // in milliseconds before expiry
  authTimeout: number; // timeout for auth initialization
  maxRetries: number;
  logSensitiveData: boolean;
}

// Validation helpers
export const validateApiResponse = <T>(response: unknown): response is ApiResponse<T> => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    typeof (response as any).success === 'boolean'
  );
};

export const validateAuthResponse = (data: unknown): data is AuthResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'user' in data &&
    'token' in data &&
    typeof (data as any).token === 'string' &&
    typeof (data as any).user === 'object'
  );
};

export const validateUser = (user: unknown): user is User => {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'userType' in user &&
    typeof (user as any).id === 'string' &&
    typeof (user as any).email === 'string' &&
    ['farmer', 'buyer', 'admin'].includes((user as any).userType)
  );
};
