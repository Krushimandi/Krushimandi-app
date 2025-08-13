/**
 * Navigation Service
 * A centralized service for handling navigation actions outside of React components
 */

import React from 'react';
import {
  CommonActions,
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import { RootStackParamList } from './types';

// Create a navigation reference that can be used outside of React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// --- Notification navigation cold start support ---
export const isNavigationReady = { current: false };
export const pendingNotificationData = { current: null as any };

/**
 * Handles notification navigation, including cold start queuing
 */
export function handleNotificationNavigation(data: any, notificationTabEmitter?: any) {
  console.log('🔔 Handling notification navigation:', data);
  
  if (!data?.screen || data?.type !== 'navigate') {
    console.log('🔔 No navigation data or not navigate type, data:', data);
    return;
  }

  const navigateToScreen = () => {
    if (!navigationRef.isReady()) {
      console.warn('Navigation not ready, queuing navigation data');
      pendingNotificationData.current = data;
      return;
    }

    console.log('🔔 Processing navigation for screen:', data.screen);

    try {
      switch (data.screen) {
        case 'MyOrdersScreen':
        case 'Orders':
          console.log('🔔 Navigating to Orders screen from notification');
          navigationRef.navigate('Main', {
            screen: 'BuyerTabs',
            params: { screen: 'Orders' },
          });
          break;
          
        case 'RequestsScreen':
        case 'Requests':
          console.log('🔔 Navigating to Requests screen from notification');
          navigationRef.navigate('Main', {
            screen: 'BuyerTabs',
            params: { screen: 'Requests' },
          });
          break;
          
        case 'HomeScreen':
          console.log('🔔 Navigating to Home screen from notification');
          navigationRef.navigate('Main', {
            screen: 'BuyerTabs',
            params: { screen: 'Home' },
          });
          break;
          
        case 'NotificationScreen':
        case 'Notification':
          console.log('🔔 Navigating to Notification screen from notification');
          navigationRef.navigate('Notification');
          break;

        case 'ProfileScreen':
        case 'Profile':
          console.log('🔔 Navigating to Profile screen from notification');
          navigationRef.navigate('ProfileScreen');
          break;

        default:
          console.log('🔔 Unknown screen in notification:', data.screen);
          // Default to home if unknown screen
          navigationRef.navigate('Main');
          break;
      }
      console.log('✅ Navigation completed successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  if (isNavigationReady.current && navigationRef.isReady()) {
    // Add small delay to ensure UI is ready
    setTimeout(() => {
      navigateToScreen();
    }, 200);
  } else {
    // Queue for later when navigation is ready
    pendingNotificationData.current = data;
    console.log('🔔 Navigation not ready, queued data:', data);
  }
}

/**
 * Navigate to a specific route
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // @ts-ignore: Type mismatch with params, but it works
    navigationRef.navigate(name, params);
  } else {
    console.warn(`Navigation attempted before navigator ready: ${String(name)}`);
  }
}

/**
 * Reset navigation to a new route
 */
export function reset(routeName: keyof RootStackParamList, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: routeName,
            params
          },
        ],
      })
    );
  } else {
    console.warn(`Navigation reset attempted before navigator ready: ${String(routeName)}`);
  }
}

/**
 * Reset to Main screen
 */
export function resetToMain() {
  reset('Main');
}

/**
 * Reset to Auth screen
 */
export function resetToAuth() {
  reset('Auth');
}

/**
 * Go back to the previous screen
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  } else {
    console.warn('Cannot go back or navigation is not ready');
  }
}

/**
 * Replace the current screen with a new one
 */
export function replace<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.replace(name as string, params));
  } else {
    console.warn(`Navigation replace attempted before navigator ready: ${String(name)}`);
  }
}

/**
 * Push a new screen onto the stack
 */
export function push<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name as string, params));
  } else {
    console.warn(`Navigation push attempted before navigator ready: ${String(name)}`);
  }
}

// Create a hook-compatible version as well
export const useNavigationService = () => {
  return {
    navigate,
    reset,
    resetToMain,
    resetToAuth,
    goBack,
    replace,
    push,
  };
};
