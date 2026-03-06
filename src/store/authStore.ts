/**
 * Auth Store using Zustand
 * Manages authentication state and actions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { User } from '../types';


interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (user: Partial<User>) => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}



export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,

      updateUser: (userData: Partial<User>) => {
        set((state) => {
          if (state.user) {
            return { user: { ...state.user, ...userData } };
          }
          return state;
        });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'userData',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuthStore) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
