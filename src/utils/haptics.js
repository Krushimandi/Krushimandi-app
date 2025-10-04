/**
 * Haptic Feedback Utility
 * 
 * Provides consistent haptic feedback across iOS and Android
 * Optimized for performance with minimal overhead
 * 
 * @module haptics
 */

import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Configuration for haptic feedback
const HAPTIC_CONFIG = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Haptic Feedback Types
 * @enum {string}
 */
export const HapticType = {
  // Light feedback - for subtle interactions
  LIGHT: 'impactLight',
  
  // Medium feedback - for standard interactions
  MEDIUM: 'impactMedium',
  
  // Heavy feedback - for important actions
  HEAVY: 'impactHeavy',
  
  // Success feedback - for successful operations
  SUCCESS: 'notificationSuccess',
  
  // Warning feedback - for warnings
  WARNING: 'notificationWarning',
  
  // Error feedback - for errors
  ERROR: 'notificationError',
  
  // Selection feedback - for selection changes
  SELECTION: 'selection',
  
  // Rigid feedback - for precise selections
  RIGID: 'rigid',
  
  // Soft feedback - for gentle interactions
  SOFT: 'soft',
};

/**
 * Check if haptic feedback is available
 * @returns {boolean}
 */
export const isHapticsAvailable = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Trigger haptic feedback
 * @param {string} type - Type of haptic feedback (use HapticType enum)
 * @param {Object} options - Optional configuration
 */
export const triggerHaptic = (type = HapticType.LIGHT, options = {}) => {
  if (!isHapticsAvailable()) {
    return;
  }

  try {
    ReactNativeHapticFeedback.trigger(type, {
      ...HAPTIC_CONFIG,
      ...options,
    });
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
    // Fallback to simple vibration
    fallbackVibrate(type);
  }
};

/**
 * Fallback vibration for devices that don't support advanced haptics
 * @param {string} type - Type of haptic feedback
 */
const fallbackVibrate = (type) => {
  try {
    switch (type) {
      case HapticType.LIGHT:
        Vibration.vibrate(10);
        break;
      case HapticType.MEDIUM:
        Vibration.vibrate(20);
        break;
      case HapticType.HEAVY:
        Vibration.vibrate(30);
        break;
      case HapticType.SUCCESS:
        Vibration.vibrate([0, 10, 50, 10]);
        break;
      case HapticType.ERROR:
        Vibration.vibrate([0, 20, 100, 20, 100, 20]);
        break;
      case HapticType.WARNING:
        Vibration.vibrate([0, 15, 80, 15]);
        break;
      case HapticType.SELECTION:
        Vibration.vibrate(5);
        break;
      default:
        Vibration.vibrate(15);
    }
  } catch (error) {
    console.warn('Fallback vibration failed:', error);
  }
};

/**
 * Pre-defined haptic feedback functions for common use cases
 */

// Light tap - for buttons, switches
export const lightHaptic = () => triggerHaptic(HapticType.LIGHT);

// Medium impact - for selections, toggles
export const mediumHaptic = () => triggerHaptic(HapticType.MEDIUM);

// Heavy impact - for important confirmations
export const heavyHaptic = () => triggerHaptic(HapticType.HEAVY);

// Success feedback - for successful operations
export const successHaptic = () => triggerHaptic(HapticType.SUCCESS);

// Error feedback - for errors
export const errorHaptic = () => triggerHaptic(HapticType.ERROR);

// Warning feedback - for warnings
export const warningHaptic = () => triggerHaptic(HapticType.WARNING);

// Selection feedback - for list selections, picker changes
export const selectionHaptic = () => triggerHaptic(HapticType.SELECTION);

// Rigid feedback - for precise UI interactions
export const rigidHaptic = () => triggerHaptic(HapticType.RIGID);

// Soft feedback - for subtle interactions
export const softHaptic = () => triggerHaptic(HapticType.SOFT);

/**
 * Custom vibration pattern
 * @param {number[]} pattern - Vibration pattern in milliseconds [wait, vibrate, wait, vibrate, ...]
 * @param {boolean} repeat - Whether to repeat the pattern
 */
export const customVibration = (pattern, repeat = false) => {
  try {
    if (repeat) {
      Vibration.vibrate(pattern, true);
    } else {
      Vibration.vibrate(pattern);
    }
  } catch (error) {
    console.warn('Custom vibration failed:', error);
  }
};

/**
 * Cancel ongoing vibration
 */
export const cancelVibration = () => {
  try {
    Vibration.cancel();
  } catch (error) {
    console.warn('Cancel vibration failed:', error);
  }
};

/**
 * Haptic feedback for specific UI interactions
 */
export const HapticFeedback = {
  // Button press
  buttonPress: () => lightHaptic(),
  
  // Toggle switch
  toggleSwitch: () => mediumHaptic(),
  
  // Item selection
  itemSelect: () => selectionHaptic(),
  
  // Swipe action
  swipeAction: () => softHaptic(),
  
  // Long press
  longPress: () => heavyHaptic(),
  
  // Pull to refresh
  refresh: () => lightHaptic(),
  
  // Navigation
  navigation: () => lightHaptic(),
  
  // Modal open/close
  modal: () => mediumHaptic(),
  
  // Alert/notification
  alert: () => warningHaptic(),
  
  // Success action
  success: () => successHaptic(),
  
  // Error action
  error: () => errorHaptic(),
  
  // Delete action
  delete: () => heavyHaptic(),
  
  // Add/create action
  create: () => mediumHaptic(),
  
  // Scroll to boundary
  scrollBoundary: () => lightHaptic(),
  
  // Picker change
  pickerChange: () => selectionHaptic(),
  
  // Slider change
  sliderChange: () => selectionHaptic(),
  
  // Checkbox/Radio
  checkboxToggle: () => lightHaptic(),
  
  // Input focus
  inputFocus: () => softHaptic(),
  
  // Tab change
  tabChange: () => selectionHaptic(),
  
  // Card flip/rotate
  cardFlip: () => rigidHaptic(),
  
  // Drag start
  dragStart: () => mediumHaptic(),
  
  // Drag end
  dragEnd: () => lightHaptic(),
  
  // Context menu
  contextMenu: () => heavyHaptic(),
};

export default {
  HapticType,
  triggerHaptic,
  lightHaptic,
  mediumHaptic,
  heavyHaptic,
  successHaptic,
  errorHaptic,
  warningHaptic,
  selectionHaptic,
  rigidHaptic,
  softHaptic,
  customVibration,
  cancelVibration,
  isHapticsAvailable,
  HapticFeedback,
};
