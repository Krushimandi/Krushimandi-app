// --- Notification navigation cold start support ---
export const isNavigationReady = { current: false };
export const pendingNotificationData = { current: null as any };

/**
 * Handles notification navigation, including cold start queuing
 */
export function handleNotificationNavigation(data: any, notificationTabEmitter?: any) {
  console.log('🔔 Handling notification navigation:', data);
  if (data?.screen === 'MyOrdersScreen' && data?.type === 'navigate') {
    if (isNavigationReady.current && navigationRef.isReady()) {
      console.log('🔔 Navigating to Orders screen from notification');
      setTimeout(() => {
        navigationRef.navigate('Main', {
          screen: 'BuyerTabs',
          params: { screen: 'Orders' },
        });
      }, 200);
    } else {
      // Queue for later
      pendingNotificationData.current = data;
    }
  }
}
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
