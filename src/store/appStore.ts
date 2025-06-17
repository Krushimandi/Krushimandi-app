/**
 * App Store using Zustand
 * Manages global app state (theme, language, settings)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, NotificationSettings } from '../types';
import { StorageKeys } from '../constants';

interface AppState {
  theme: Theme;
  language: string;
  isOnboardingComplete: boolean;
  notificationSettings: NotificationSettings;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  completeOnboarding: () => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  resetApp: () => void;
}

const initialNotificationSettings: NotificationSettings = {
  push: true,
  email: true,
  sms: false,
  orderUpdates: true,
  promotional: false,
  system: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      language: 'en',
      isOnboardingComplete: false,
      notificationSettings: initialNotificationSettings,

      // Actions
      setTheme: (theme: Theme) => {
        set({ theme });
      },

      setLanguage: (language: string) => {
        set({ language });
      },

      completeOnboarding: () => {
        set({ isOnboardingComplete: true });
      },

      updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
        const currentSettings = get().notificationSettings;
        set({
          notificationSettings: { ...currentSettings, ...settings },
        });
      },

      resetApp: () => {
        set({
          theme: 'system',
          language: 'en',
          isOnboardingComplete: false,
          notificationSettings: initialNotificationSettings,
        });
      },
    }),
    {
      name: StorageKeys.APP_SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
