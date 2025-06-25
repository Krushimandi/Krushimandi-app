/**
 * Navigation Control Utilities
 * This file provides examples of how to control the bottom tab bar visibility
 */

import { useNavigationControl } from '../navigation/NavigationProvider';

/**
 * Example function showing how to use the tab bar toggle functionality
 * Import this in any component that needs to control the tab bar
 */
export const useTabBarControl = () => {
  const { showTabBar, hideTabBar, toggleTabBar } = useNavigationControl();
  
  return {
    /**
     * Show the tab bar with smooth animation
     */
    showTabBar,
    
    /**
     * Hide the tab bar with smooth animation
     */
    hideTabBar,
    
    /**
     * Toggle the tab bar visibility (if visible, hide it, if hidden, show it)
     */
    toggleTabBar,
    
    /**
     * Example: Hide tab bar when entering a specific screen
     * Use in useEffect or screen focus events
     */
    hideTabBarOnScreenFocus: () => {
      hideTabBar();
      return () => showTabBar(); // Return cleanup function to restore tab bar on unmount
    },
    
    /**
     * Example: Hide tab bar when keyboard is shown
     */
    handleKeyboardOpen: () => {
      hideTabBar();
    },
    
    /**
     * Example: Show tab bar when keyboard is dismissed
     */
    handleKeyboardClose: () => {
      showTabBar();
    }
  };
};
