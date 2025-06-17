/**
 * HTTP Client Configuration
 * Axios setup with interceptors for auth, error handling, and logging
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from '../config';
import { StorageKeys } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: config.API_BASE_URL,
    timeout: config.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  // Request interceptor for auth token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const token = await AsyncStorage.getItem(StorageKeys.USER_TOKEN);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error);
      }      // Log request in development
      if (__DEV__) {
        console.log('🚀 Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error: AxiosError) => {
      if (__DEV__) {
        console.error('❌ Request Error:', error);
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response in development
      if (__DEV__ && config.ENABLE_LOGS) {
        console.log('✅ Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
      }

      return response;
    },
    async (error: AxiosError) => {
      if (__DEV__) {
        console.error('❌ Response Error:', {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
        });
      }

      // Handle token expiration
      if (error.response?.status === 401) {
        try {
          // Try to refresh token
          const refreshToken = await AsyncStorage.getItem(StorageKeys.USER_TOKEN);
          if (refreshToken && error.config) {
            // Implement token refresh logic here
            // For now, just clear the token and redirect to login
            await AsyncStorage.removeItem(StorageKeys.USER_TOKEN);
            await AsyncStorage.removeItem(StorageKeys.USER_DATA);
            
            // You can emit an event here to redirect to login screen
            // EventEmitter.emit('UNAUTHORIZED');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }      // Transform error for consistent handling
      const errorMessage = (error.response?.data as any)?.message || 
                          (error.response?.data as any)?.error || 
                          error.message || 
                          'An unexpected error occurred';

      const transformedError = {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
        originalError: error,
      };

      return Promise.reject(transformedError);
    }
  );

  return client;
};

// Export configured HTTP client
export const httpClient = createHttpClient();

// Export types for use in services
export type { InternalAxiosRequestConfig, AxiosResponse, AxiosError };
