/**
 * Theme Hook
 * Custom hook for theme management
 */

import { useColorScheme } from 'react-native';
import { useAppStore } from '../store';
import { Colors } from '../constants';

export const useTheme = () => {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  
  const currentTheme = theme === 'system' ? systemColorScheme || 'light' : theme;
  const isDark = currentTheme === 'dark';
  
  const colors = isDark ? Colors.dark : Colors.light;
  
  return {
    theme: currentTheme,
    isDark,
    colors,
  };
};
