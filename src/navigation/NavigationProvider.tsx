/**
 * Navigation Provider
 * Manages the tab bar visibility and animations
 */

import React from 'react';
import { Animated, Easing } from 'react-native';

// Create Navigation Context for Tab Bar Visibility
interface NavigationContextProps {
  showTabBar: () => void;
  hideTabBar: () => void;
  toggleTabBar: () => void;
  tabBarVisible: boolean;
  tabBarAnimation: Animated.Value;
}

export const NavigationContext = React.createContext<NavigationContextProps>({
  showTabBar: () => { },
  hideTabBar: () => { },
  toggleTabBar: () => { },
  tabBarVisible: true,
  tabBarAnimation: new Animated.Value(1),
});

// Navigation Provider to manage tab bar visibility
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabBarVisible, setTabBarVisible] = React.useState<boolean>(true);
  const tabBarAnimation = React.useRef(new Animated.Value(1)).current;

  // Show tab bar with slide up animation
  const showTabBar = React.useCallback(() => {
    setTabBarVisible(true);
    Animated.timing(tabBarAnimation, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [tabBarAnimation]);

  // Hide tab bar with slide down animation
  const hideTabBar = React.useCallback(() => {
    Animated.timing(tabBarAnimation, {
      toValue: 0,
      duration: 300,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      setTabBarVisible(false);
    });
  }, [tabBarAnimation]);

  // Toggle tab bar visibility
  const toggleTabBar = React.useCallback(() => {
    if (tabBarVisible) {
      hideTabBar();
    } else {
      showTabBar();
    }
  }, [tabBarVisible, hideTabBar, showTabBar]);

  const value = React.useMemo(() => ({
    showTabBar,
    hideTabBar,
    toggleTabBar,
    tabBarVisible,
    tabBarAnimation,
  }), [showTabBar, hideTabBar, toggleTabBar, tabBarVisible, tabBarAnimation]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

// Custom hook to access navigation context
export const useNavigationControl = () => React.useContext(NavigationContext);
