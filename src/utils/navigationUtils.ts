/**
 * Navigation Utilities
 * Helper functions for navigation actions that can be used outside of React components
 */

import { 
  navigationRef, 
  resetToMain, 
  resetToAuth,
  navigate as navigateService,
  goBack as goBackService 
} from '../navigation/navigationService';
import { RootStackParamList } from '../navigation/types';

/**
 * Navigate to a screen in the app
 * @param name - The name of the screen to navigate to
 * @param params - The parameters to pass to the screen
 */
export const navigate = <RouteName extends keyof RootStackParamList>(
  name: RouteName, 
  params?: RootStackParamList[RouteName]
) => {
  navigateService(name, params);
};

/**
 * Reset the navigation state to Main screen
 * Use this after authentication is complete
 */
export const navigateToMain = () => resetToMain();

/**
 * Reset the navigation state to Auth screen
 * Use this after logout
 */
export const navigateToAuth = () => resetToAuth();

/**
 * Go back to the previous screen
 */
export const goBack = () => {
  goBackService();
};
