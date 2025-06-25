/**
 * Root Navigator
 * Main entry point for app navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import { navigationRef } from './navigationService';

// Helpers
import { getAuthState, debugAuthState, UserAuthState } from '../utils/authFlow';

// Screen components
import LoadingScreen from '../components/common/LoadingScreen';
import { NotificationScreen, NotificationDetail } from '../components/notification';
import { SettingsScreen } from '../components/settings';
import { ProfileScreen } from '../components/profile';

// Navigation provider
import { NavigationProvider } from './NavigationProvider';

// Navigation stacks
import AuthNavigator, { getAuthScreen } from './auth/AuthStack';
import FarmerStack from './farmer/FarmerStack';
import BuyerStack from './buyer/BuyerStack';

// Types
import { RootStackParamList } from './types';

// Store
import { useAuthStore } from '../store';

const RootStack = createStackNavigator<RootStackParamList>();

// We're now using navigationRef from navigationService

// Root Navigator
const AppNavigator = () => {
  const [authState, setAuthState] = React.useState<UserAuthState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const authStore = useAuthStore();
  const userRole = authStore.user?.userType;

  React.useEffect(() => {
    const checkAuthState = async () => {
      try {
        const state = await getAuthState();
        if (__DEV__) await debugAuthState();
        setAuthState(state);
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          phoneVerified: false,
          roleSelected: false,
          profileCompleted: false,
          currentStep: 'welcome',
          nextRoute: 'Auth',
        });
      } finally {
        setLoading(false);
      }
    };
    const unsubscribe = auth().onAuthStateChanged(async () => {
      await checkAuthState();
    });
    checkAuthState();
    return unsubscribe;
  }, []);
  // Choose the appropriate stack based on user role
  const getMainComponent = () => {
    switch (userRole) {
      case 'buyer':
        return BuyerStack;
      case 'farmer':
        return FarmerStack;
      default:
        // If userRole is undefined or not recognized, default to FarmerStack
        console.warn('User role not defined or recognized, defaulting to Farmer UI');
        return FarmerStack;
    }
  };

  if (loading || !authState) {
    return <LoadingScreen />;
  }
  
  // If not authenticated, route to correct AuthStack screen
  if (!authState.isAuthenticated || authState.nextRoute === 'Auth') {
    const initialAuthScreen = getAuthScreen(authState.currentStep);    return (
      <NavigationProvider>
        <NavigationContainer ref={navigationRef} onReady={() => console.log('Navigation container is ready')}>
          <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          </RootStack.Navigator>
        </NavigationContainer>
      </NavigationProvider>
    );
  }
  
  // If authenticated, go to Main based on role
  const MainStack = getMainComponent();
  return (
    <NavigationProvider>
      <NavigationContainer ref={navigationRef} onReady={() => console.log('Navigation container is ready')}>
        <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Main">
          <RootStack.Screen name="Main" component={MainStack} />
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Notification" component={NotificationScreen} />
          <RootStack.Screen name="NotificationDetail" component={NotificationDetail as React.ComponentType<any>} />
          <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
          <RootStack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </NavigationProvider>
  );
};

export default AppNavigator;
