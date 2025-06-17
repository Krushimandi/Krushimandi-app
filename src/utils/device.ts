/**
 * Device Utilities
 * Device-specific helper functions
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

// Get screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Check if device is iOS
export const isIOS = Platform.OS === 'ios';

// Check if device is Android
export const isAndroid = Platform.OS === 'android';

// Get platform-specific styles
export const getPlatformStyle = (iosStyle: any, androidStyle: any) => {
  return isIOS ? iosStyle : androidStyle;
};

// Get status bar height
export const getStatusBarHeight = () => {
  if (isIOS) {
    return 44; // Default iOS status bar height
  }
  return StatusBar.currentHeight || 24;
};

// Check if device has notch (simplified)
export const hasNotch = () => {
  const { height, width } = getScreenDimensions();
  return (
    isIOS &&
    (height >= 812 || width >= 812) // iPhone X and newer
  );
};

// Get safe area insets (simplified)
export const getSafeAreaInsets = () => {
  const statusBarHeight = getStatusBarHeight();
  const bottomInset = hasNotch() ? 34 : 0;
  
  return {
    top: statusBarHeight,
    bottom: bottomInset,
    left: 0,
    right: 0,
  };
};
