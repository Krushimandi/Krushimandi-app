/**
 * HTTP Request/Response Interceptors
 * Modular interceptors for authentication, logging, and error handling
 * Enhanced with persistent authentication support
 */

import { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { secureStorage } from '../utils/secureStorage';
import { persistentAuthManager } from '../utils/persistentAuthManager';

/**
 * Authentication Interceptor
 * Handles token injection and refresh logic
 */
export class AuthInterceptor {
  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Request interceptor to add auth token
   */
  static async requestInterceptor(
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> {
    try {
      // Skip auth for login/register endpoints
      const skipAuthPaths = ['/auth/login', '/auth/register', '/auth/refresh'];
      const shouldSkipAuth = skipAuthPaths.some(path => config.url?.includes(path));
      
      if (shouldSkipAuth) {
        return config;
      }

      // Get valid access token
      let token = await secureStorage.getAccessToken();
      
      // Check if token is valid
      const isValid = await secureStorage.isTokenValid();
      if (!isValid && token) {
        // Token exists but expired, try to refresh
        token = await this.refreshTokenIfNeeded();
      }

      // Add token to headers if available
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.warn('Auth interceptor failed:', error);
      return config;
    }
  }

  /**
   * Response interceptor for handling 401 errors
   */
  static async responseErrorInterceptor(error: AxiosError): Promise<never> {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await this.refreshTokenIfNeeded();
        
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Retry the original request with new token
          const { default: axios } = await import('axios');
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Use persistent auth manager to determine if we should logout
        const authResult = await persistentAuthManager.handleAuthError(refreshError, 'token_refresh_401');
        
        if (authResult.shouldLogout) {
          console.log('🚪 Persistent auth manager determined logout is required:', authResult.reason);
          await this.handleAuthFailure();
        } else {
          console.log('🔒 Maintaining session despite auth error:', authResult.reason);
        }
      }
    }

    return Promise.reject(error);
  }

  /**
   * Refresh token with queue management to prevent concurrent refresh calls
   */
  private static async refreshTokenIfNeeded(): Promise<string | null> {
    // Return existing refresh promise if already in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh
   */
  private static async performTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const { default: axios } = await import('axios');
      const response = await axios.post('/auth/refresh', {
        refreshToken
      });

      const { accessToken, expiresIn } = response.data;
      const expiresAt = Date.now() + (expiresIn * 1000);

      // Update access token in secure storage
      await secureStorage.updateAccessToken(accessToken, expiresAt);

      if (__DEV__) {
        console.log('✅ Token refreshed successfully');
      }

      // Reset failure count on successful refresh
      await persistentAuthManager.resetFailureCount();

      return accessToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Handle authentication failure (clear tokens and redirect)
   */
  private static async handleAuthFailure(): Promise<void> {
    try {
      await secureStorage.clearTokens();
      
      // Emit auth failure event for navigation
      const { EventEmitter } = await import('events');
      const eventEmitter = new EventEmitter();
      eventEmitter.emit('AUTH_FAILURE');
      
      if (__DEV__) {
        console.log('🚪 Authentication failed, tokens cleared');
      }
    } catch (error) {
      console.error('Failed to handle auth failure:', error);
    }
  }
}

/**
 * Logging Interceptor
 * Handles secure request/response logging
 */
export class LoggingInterceptor {
  private static readonly SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  private static readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'refresh_token',
    'access_token',
    'secret',
    'key',
  ];

  /**
   * Request logging interceptor
   */
  static requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (__DEV__) {
      const sanitizedConfig = this.sanitizeRequestData(config);
      console.log('🚀 HTTP Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        params: sanitizedConfig.params,
        data: sanitizedConfig.data,
        headers: sanitizedConfig.headers,
      });
    }
    return config;
  }

  /**
   * Response logging interceptor
   */
  static responseInterceptor(response: AxiosResponse): AxiosResponse {
    if (__DEV__) {
      const sanitizedData = this.sanitizeResponseData(response.data);
      console.log('✅ HTTP Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        data: sanitizedData,
      });
    }
    return response;
  }

  /**
   * Error logging interceptor
   */
  static errorInterceptor(error: AxiosError): Promise<never> {
    if (__DEV__) {
      const sanitizedError = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: this.sanitizeResponseData(error.response?.data),
      };
      console.error('❌ HTTP Error:', sanitizedError);
    }
    return Promise.reject(error);
  }

  /**
   * Sanitize request data by masking sensitive information
   */
  private static sanitizeRequestData(config: InternalAxiosRequestConfig) {
    return {
      params: this.maskSensitiveData(config.params),
      data: this.maskSensitiveData(config.data),
      headers: this.maskSensitiveHeaders(config.headers),
    };
  }

  /**
   * Sanitize response data
   */
  private static sanitizeResponseData(data: any) {
    return this.maskSensitiveData(data);
  }

  /**
   * Mask sensitive headers
   */
  private static maskSensitiveHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };
    
    this.SENSITIVE_HEADERS.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '***MASKED***';
      }
      if (sanitized[header.toUpperCase()]) {
        sanitized[header.toUpperCase()] = '***MASKED***';
      }
    });

    return sanitized;
  }

  /**
   * Recursively mask sensitive data
   */
  private static maskSensitiveData(obj: any): any {
    if (!obj) return obj;

    if (typeof obj === 'string') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveData(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = this.SENSITIVE_FIELDS.some(field => 
          lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = '***MASKED***';
        } else if (typeof value === 'object') {
          sanitized[key] = this.maskSensitiveData(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }

    return obj;
  }
}
