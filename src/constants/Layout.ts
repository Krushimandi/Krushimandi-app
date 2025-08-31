/**
 * Layout Constants for KrushiMandi App
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Dynamic header constants that adapt to safe area
export const getHeaderConstants = (safeAreaTop: number = 0) => {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
  const safeTop = Math.max(safeAreaTop, statusBarHeight);
  
  return {
    HEADER_MAX_HEIGHT: 132 + safeTop, // Increased for better proportion
    HEADER_MIN_HEIGHT: 62 + safeTop,  // Increased min height
    HEADER_SCROLL_DISTANCE: 96, // Optimal scroll distance
    SAFE_AREA_TOP: safeTop,
  };
};

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
  
  // Header Heights (Static - use getHeaderConstants() for dynamic values)
  header: {
    height: Platform.OS === 'ios' ? 88 : 64,
    maxHeight: 140, // Base max height without safe area
    minHeight: 60,  // Base min height without safe area
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
