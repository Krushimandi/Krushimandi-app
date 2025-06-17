/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants';
import { 
  LoginRequest, 
  RegisterRequest, 
  OTPVerificationRequest, 
  ApiResponse, 
  User 
} from '../types';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

class AuthService {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await httpClient.post<ApiResponse<AuthResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response.data.data!;
  }

  async register(data: RegisterRequest): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  }

  async verifyOTP(data: OTPVerificationRequest): Promise<AuthResponse> {
    const response = await httpClient.post<ApiResponse<AuthResponse>>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      data
    );
    return response.data.data!;
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await httpClient.post<ApiResponse<AuthResponse>>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { token }
    );
    return response.data.data!;
  }

  async logout(): Promise<void> {
    await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  }

  async forgotPassword(phone: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { phone }
    );
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, password }
    );
    return response.data;
  }

  async sendOTP(phone: string): Promise<ApiResponse> {
    const response = await httpClient.post<ApiResponse>(
      '/auth/send-otp',
      { phone }
    );
    return response.data;
  }
}

export const authService = new AuthService();
