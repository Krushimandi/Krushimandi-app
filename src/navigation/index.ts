/**
 * Navigation Index
 * Re-exports navigation components and types
 */

// Navigation Provider
export { NavigationProvider, useNavigationControl } from './NavigationProvider';

// Navigators
export { default as AppNavigator } from './AppNavigator';

// Navigation Service
export {
  navigationRef,
  navigate,
  reset,
  resetToMain,
  resetToAuth,
  goBack,
  replace,
  push,
  useNavigationService,
} from './navigationService';
export { default as AuthNavigator } from './auth/AuthStack';
export { default as FarmerStack } from './farmer/FarmerStack';
export { default as BuyerStack } from './buyer/BuyerStack';

// Types
export * from './types';
