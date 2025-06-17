/**
 * Auth Store using Zustand
 * Manages authentication state and actions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';
import { StorageKeys } from '../constants';
import { authService } from '../services/authService';

interface AuthStore extends AuthState {
  // Actions
  login: (phone: string, password?: string, otp?: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;  clearError: () => void;
  setLoading: (loading: boolean) => void;
  // Temporary function for testing
  setTempAuth: (authenticated: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (phone: string, password?: string, otp?: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authService.login({ phone, password, otp });
          
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },      register: async (userData: any): Promise<void> => {
        try {
          set({ isLoading: true, error: null });
          
          await authService.register(userData);
          
          set({
            isAuthenticated: false, // User needs to verify OTP
            user: null,
            token: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      verifyOTP: async (phone: string, otp: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authService.verifyOTP({ phone, otp });
          
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'OTP verification failed',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          await authService.logout();
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Even if logout fails on server, clear local state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshToken: async () => {
        try {
          const currentToken = get().token;
          if (!currentToken) {
            throw new Error('No token available');
          }
          
          const response = await authService.refreshToken(currentToken);
          
          set({
            token: response.token,
            user: response.user,
          });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Temporary function for testing - remove in production
      setTempAuth: (authenticated: boolean) => {
        if (authenticated) {
          set({
            isAuthenticated: true,
            user: { 
              id: 'temp-user', 
              firstName: 'Test', 
              lastName: 'User',
              email: 'test@example.com',
              phone: '+1234567890',
              userType: 'buyer',
              status: 'active',
              isVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            token: 'temp-token',
            error: null
          });
        } else {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            error: null
          });
        }
      },
    }),
    {
      name: StorageKeys.USER_DATA,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
