/**
 * Layout Constants for KrushiMandi App
 */

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const Layout = {
  // Screen Dimensions
  window: {
    width: screenWidth,
    height: screenHeight,
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  
  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  
  // Component Sizes
  button: {
    height: 48,
    heightSmall: 36,
    heightLarge: 56,
  },
  
  input: {
    height: 48,
    borderRadius: 8,
  },
  
  // Header Heights
  header: {
    height: Platform.OS === 'ios' ? 88 : 64,
  },
  
  // Tab Bar
  tabBar: {
    height: Platform.OS === 'ios' ? 83 : 60,
  },
  
  // Status Bar
  statusBar: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
};

// Device Type Detection
export const DeviceType = {
  isSmallDevice: screenWidth < 375,
  isTablet: screenWidth >= 768,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};
