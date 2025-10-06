/**
 * HTTP Error Handler
 * Centralized error handling with user-friendly messages
 */

import { AxiosError } from 'axios';
import NetInfo from '@react-native-community/netinfo';

export interface HttpError {
  message: string;
  code: string;
  status?: number;
  data?: any;
  isNetworkError: boolean;
  isTimeout: boolean;
  isServerError: boolean;
  isClientError: boolean;
  originalError: AxiosError;
}

export class HttpErrorHandler {
  private static readonly ERROR_MESSAGES = {
    NETWORK_ERROR: 'Please check your internet connection and try again.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
    CLIENT_ERROR: 'Invalid request. Please check your input and try again.',
    UNAUTHORIZED: 'Your session has expired. Please login again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    CONFLICT: 'This action conflicts with existing data.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  };

  /**
   * Process and transform axios error into user-friendly HttpError
   */
  static async processError(error: AxiosError): Promise<HttpError> {
    const httpError: HttpError = {
      message: '',
      code: '',
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: false,
      isTimeout: false,
      isServerError: false,
      isClientError: false,
      originalError: error,
    };

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected && networkState.isInternetReachable;

    // Network error
    if (!isConnected || error.code === 'NETWORK_ERROR' || !error.response) {
      httpError.isNetworkError = true;
      httpError.code = 'NETWORK_ERROR';
      httpError.message = this.ERROR_MESSAGES.NETWORK_ERROR;
      return httpError;
    }

    // Timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      httpError.isTimeout = true;
      httpError.code = 'TIMEOUT_ERROR';
      httpError.message = this.ERROR_MESSAGES.TIMEOUT_ERROR;
      return httpError;
    }

    // HTTP status code based errors
    const status = error.response.status;

    if (status >= 500) {
      httpError.isServerError = true;
      httpError.code = 'SERVER_ERROR';
      httpError.message = this.ERROR_MESSAGES.SERVER_ERROR;
    } else if (status >= 400) {
      httpError.isClientError = true;
      httpError.code = this.getClientErrorCode(status);
      httpError.message = this.getClientErrorMessage(status, error.response.data);
    } else {
      httpError.code = 'UNKNOWN_ERROR';
      httpError.message = this.ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    return httpError;
  }

  /**
   * Get specific client error code based on status
   */
  private static getClientErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      default:
        return 'CLIENT_ERROR';
    }
  }

  /**
   * Get user-friendly error message for client errors
   */
  private static getClientErrorMessage(status: number, responseData: any): string {
    // Try to extract meaningful error from server response
    let serverMessage = '';
    
    if (responseData) {
      serverMessage = responseData.message || 
                     responseData.error || 
                     responseData.detail ||
                     '';
    }

    // Return sanitized message based on status
    switch (status) {
      case 400:
        return this.sanitizeServerMessage(serverMessage) || this.ERROR_MESSAGES.VALIDATION_ERROR;
      case 401:
        return this.ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return this.ERROR_MESSAGES.FORBIDDEN;
      case 404:
        return this.ERROR_MESSAGES.NOT_FOUND;
      case 409:
        return this.ERROR_MESSAGES.CONFLICT;
      case 422:
        return this.sanitizeServerMessage(serverMessage) || this.ERROR_MESSAGES.VALIDATION_ERROR;
      default:
        return this.ERROR_MESSAGES.CLIENT_ERROR;
    }
  }

  /**
   * Sanitize server error messages to prevent information leakage
   */
  private static sanitizeServerMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return '';
    }

    // Remove technical terms that might reveal internal structure
    const sensitiveTerms = [
      'database',
      'sql',
      'mongodb',
      'redis',
      'internal server',
      'stack trace',
      'exception',
      'null pointer',
      'undefined index',
      'connection refused',
      'timeout',
      'localhost',
      '127.0.0.1',
      'port',
      'socket',
    ];

    const lowerMessage = message.toLowerCase();
    const hasSensitiveTerms = sensitiveTerms.some(term => 
      lowerMessage.includes(term.toLowerCase())
    );

    // If message contains sensitive terms, return empty (fallback to generic message)
    if (hasSensitiveTerms) {
      return '';
    }

    // Limit message length and clean it
    const cleanMessage = message
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove potential XSS
      .substring(0, 200) // Limit length
      .trim();

    return cleanMessage;
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(httpError: HttpError): boolean {
    return httpError.isNetworkError || 
           httpError.isTimeout || 
           httpError.isServerError ||
           !!(httpError.status && httpError.status >= 500);
  }

  /**
   * Get retry delay based on attempt number (exponential backoff)
   */
  static getRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Log error appropriately based on environment
   */
  static logError(httpError: HttpError): void {
    if (__DEV__) {
      console.error('HTTP Error Details:', {
        message: httpError.message,
        code: httpError.code,
        status: httpError.status,
        isNetworkError: httpError.isNetworkError,
        isTimeout: httpError.isTimeout,
        isServerError: httpError.isServerError,
        isClientError: httpError.isClientError,
        url: httpError.originalError.config?.url,
        method: httpError.originalError.config?.method,
      });
    } else {
      console.error('HTTP Error:', httpError.message);
    }
  }
}
