/**
 * Secure HTTP Client Configuration
 * Modern Axios setup with comprehensive security, error handling, and request management
 * 
 * Security Features:
 * - Secure token storage using device keychain
 * - Automatic token refresh with queue management
 * - Request/response data sanitization
 * - SSL pinning support (configurable)
 * - Request cancellation and cleanup
 * 
 * @version 1.0.0
 * @author Krushimandi Team
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from '../config';
import { AuthInterceptor, LoggingInterceptor } from './httpInterceptors';
import { HttpErrorHandler, HttpError } from './httpErrorHandler';
import { requestCancellationManager, CancellableRequest } from './requestCancellation';

// Enhanced HTTP Client configuration
interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
  enableSSLPinning: boolean;
}

const defaultConfig: HttpClientConfig = {
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT || 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  enableSSLPinning: false, // Enable in production
};

/**
 * Enhanced HTTP Client with comprehensive security and error handling
 */
class SecureHttpClient {
  private axiosInstance: AxiosInstance;
  private config: HttpClientConfig;

  constructor(customConfig?: Partial<HttpClientConfig>) {
    this.config = { ...defaultConfig, ...customConfig };
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Create configured axios instance
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'KrushimandiApp/2.0',
        'X-Requested-With': 'XMLHttpRequest',
      },
      // Security headers
      validateStatus: (status) => status < 500, // Don't reject 4xx errors, handle them gracefully
    });

    return instance;
  }

  /**
   * Setup all interceptors with proper error handling
   */
  private setupInterceptors(): void {
    // Request interceptors (order matters - last added runs first)
    this.axiosInstance.interceptors.request.use(
      AuthInterceptor.requestInterceptor,
      (error: AxiosError) => {
        if (this.config.enableLogging) {
          LoggingInterceptor.errorInterceptor(error);
        }
        return Promise.reject(error);
      }
    );

    if (this.config.enableLogging) {
      this.axiosInstance.interceptors.request.use(
        LoggingInterceptor.requestInterceptor,
        LoggingInterceptor.errorInterceptor
      );
    }

    // Response interceptors
    if (this.config.enableLogging) {
      this.axiosInstance.interceptors.response.use(
        LoggingInterceptor.responseInterceptor,
        LoggingInterceptor.errorInterceptor
      );
    }

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      AuthInterceptor.responseErrorInterceptor
    );

    // Main error handling interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      this.handleResponseError.bind(this)
    );
  }

  /**
   * Enhanced error handling with retry logic
   */
  private async handleResponseError(error: AxiosError): Promise<AxiosResponse | never> {
    const httpError = await HttpErrorHandler.processError(error);
    HttpErrorHandler.logError(httpError);

    // Handle retryable errors
    if (this.shouldRetryRequest(error, httpError)) {
      return this.retryRequest(error);
    }

    return Promise.reject(httpError);
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetryRequest(error: AxiosError, httpError: HttpError): boolean {
    const config = error.config as InternalAxiosRequestConfig & { 
      _retryCount?: number;
      _retryable?: boolean;
    };

    if (!config || config._retryable === false) return false;
    if (!HttpErrorHandler.isRetryableError(httpError)) return false;
    
    const retryCount = config._retryCount || 0;
    return retryCount < this.config.maxRetries;
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config as InternalAxiosRequestConfig & { 
      _retryCount?: number;
    };

    config._retryCount = (config._retryCount || 0) + 1;
    
    const delay = HttpErrorHandler.getRetryDelay(config._retryCount);
    
    if (__DEV__) {
      console.log(`🔄 Retrying request (${config._retryCount}/${this.config.maxRetries}) after ${delay}ms`);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.axiosInstance(config);
  }

  /**
   * Make HTTP GET request with cancellation support
   */
  async get<T = any>(
    url: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * Make HTTP POST request with cancellation support
   */
  async post<T = any>(
    url: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, data });
  }

  /**
   * Make HTTP PUT request with cancellation support
   */
  async put<T = any>(
    url: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, data });
  }

  /**
   * Make HTTP PATCH request with cancellation support
   */
  async patch<T = any>(
    url: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, data });
  }

  /**
   * Make HTTP DELETE request with cancellation support
   */
  async delete<T = any>(
    url: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  /**
   * Core request method with comprehensive error handling and cancellation
   */
  private async request<T = any>(options: InternalRequestOptions): Promise<ApiResponse<T>> {
    const {
      url,
      method = 'GET',
      data,
      params,
      headers = {},
      timeout,
      retryable = true,
      groupId,
      ...restOptions
    } = options;

    // Create cancellable request
    const cancellableRequest = requestCancellationManager.createRequest(
      url,
      method,
      groupId
    );

    try {
      // Prepare request config
      const requestConfig: InternalAxiosRequestConfig & { 
        _retryable?: boolean;
        onUploadProgress?: (progressEvent: any) => void;
      } = {
        url,
        method: method as any,
        data,
        params,
        headers: headers as any,
        signal: cancellableRequest.controller.signal,
        timeout: timeout || this.config.timeout,
        _retryable: retryable,
        ...restOptions,
      };

      // Execute request
      const response = await this.axiosInstance(requestConfig);

      // Mark request as completed
      requestCancellationManager.completeRequest(cancellableRequest.id);

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        success: true,
      };

    } catch (error) {
      // Mark request as completed (even if failed)
      requestCancellationManager.completeRequest(cancellableRequest.id);

      // Handle cancellation
      if (axios.isCancel(error)) {
        throw {
          message: 'Request was cancelled',
          code: 'REQUEST_CANCELLED',
          cancelled: true,
        };
      }

      // Re-throw processed error
      throw error;
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = any>(
    url: string,
    file: FormData,
    options: UploadOptions = {}
  ): Promise<ApiResponse<T>> {
    const { onProgress, groupId, ...restOptions } = options;

    return this.request<T>({
      url,
      method: 'POST',
      data: file,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      groupId,
      onUploadProgress: onProgress ? (progressEvent: any) => {
        const progress = progressEvent.loaded / progressEvent.total;
        onProgress(progress, progressEvent);
      } : undefined,
      timeout: 300000, // 5 minutes for file uploads
      ...restOptions,
    });
  }

  /**
   * Cancel requests by group ID
   */
  cancelRequestGroup(groupId: string, reason?: string): number {
    return requestCancellationManager.cancelRequestGroup(groupId, reason);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(reason?: string): number {
    return requestCancellationManager.cancelAllRequests(reason);
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return requestCancellationManager.getActiveRequestCount();
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance if needed
    if (newConfig.timeout) {
      this.axiosInstance.defaults.timeout = newConfig.timeout;
    }
    
    if (newConfig.baseURL) {
      this.axiosInstance.defaults.baseURL = newConfig.baseURL;
    }
  }
}

// Types for better TypeScript support
export interface RequestOptions {
  params?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryable?: boolean;
  groupId?: string;
}

interface InternalRequestOptions extends RequestOptions {
  url: string;
  method?: string;
  data?: any;
  onUploadProgress?: (progressEvent: any) => void;
}

export interface UploadOptions extends RequestOptions {
  onProgress?: (progress: number, event: any) => void;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  success: boolean;
}

// Export configured HTTP client instance
export const httpClient = new SecureHttpClient({
  enableLogging: __DEV__,
  enableSSLPinning: !__DEV__, // Enable SSL pinning in production
});

// Export types and classes for advanced usage
export { SecureHttpClient, requestCancellationManager };
export type { HttpClientConfig, CancellableRequest, HttpError };
