/**
 * Root Navigator
 * Main entry point for app navigation - Now uses bootstrap state
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef } from './navigationService';

// Screen components
import LoadingScreen from '../components/common/LoadingScreen';
import { NotificationScreen, NotificationDetail } from '../components/notification';
import { SettingsScreen } from '../components/settings';
import { ProfileScreen } from '../components/profile';

// Navigation provider
import { NavigationProvider } from './NavigationProvider';

// Navigation stacks
import AuthNavigator from './auth/AuthStack';
import FarmerStack from './farmer/FarmerStack';
import BuyerStack from './buyer/BuyerStack';

// Types
import { RootStackParamList } from './types';
import { AuthBootstrapState } from '../utils/authBootstrap';
import { useAuthState } from '../components/providers/AuthStateProvider';

const RootStack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  bootstrapState: AuthBootstrapState;
}

// Root Navigator
const AppNavigator: React.FC<AppNavigatorProps> = ({ bootstrapState }) => {
  const { isAuthenticated, userRole, isLoading } = useAuthState();
  const [navigationKey, setNavigationKey] = useState(0);

  console.log('🔍 AppNavigator render - Bootstrap State:', {
    isAuthenticated: bootstrapState.isAuthenticated,
    userRole: bootstrapState.userRole,
    contextAuth: isAuthenticated,
    contextRole: userRole,
    isLoading
  });

  // Force navigation re-mount when auth state changes
  useEffect(() => {
    const currentIsAuthenticated = isAuthenticated || bootstrapState.isAuthenticated;
    const currentUserRole = userRole || bootstrapState.userRole;
    const shouldShowMainApp = currentIsAuthenticated && currentUserRole;
    
    console.log('🔄 Auth state changed, re-evaluating navigation:', {
      currentIsAuthenticated,
      currentUserRole,
      shouldShowMainApp
    });
    
    setNavigationKey(prev => prev + 1);
  }, [isAuthenticated, userRole, bootstrapState.isAuthenticated, bootstrapState.userRole]);

  console.log('🔍 AppNavigator render - Bootstrap State:', {
    isAuthenticated: bootstrapState.isAuthenticated,
    userRole: bootstrapState.userRole,
    contextAuth: isAuthenticated,
    contextRole: userRole,
    isLoading
  });

  // Choose the appropriate stack based on user role
  const getMainComponent = () => {
    console.log('🎯 getMainComponent called with userRole:', userRole);
    // return FarmerStack; // Default to BuyerStack for now
    switch (userRole) {
      case 'buyer':
        console.log('📱 Routing to BuyerStack for buyer role');
        return BuyerStack;
      case 'farmer':
        console.log('🌾 Routing to FarmerStack for farmer role');
        return FarmerStack;
      default:
        // If userRole is undefined or not recognized, default to FarmerStack
        console.warn('⚠️ User role not defined or recognized:', userRole, 'defaulting to Farmer UI');
        return FarmerStack;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Use current auth state instead of just bootstrap state
  const currentIsAuthenticated = isAuthenticated || bootstrapState.isAuthenticated;
  const currentUserRole = userRole || bootstrapState.userRole;
  
  // Determine initial route based on current auth state
  const shouldShowMainApp = currentIsAuthenticated && currentUserRole;
  const initialRouteName = shouldShowMainApp ? "Main" : "Auth";

  console.log('🚀 AppNavigator - Final routing decision:', {
    currentIsAuthenticated,
    currentUserRole,
    shouldShowMainApp,
    initialRouteName,
    bootstrapIsAuth: bootstrapState.isAuthenticated,
    bootstrapRole: bootstrapState.userRole,
    contextIsAuth: isAuthenticated,
    contextRole: userRole
  });

  // Choose the appropriate main stack component
  const MainStack = getMainComponent();

  return (
    <NavigationProvider>
      <NavigationContainer 
        key={navigationKey}
        ref={navigationRef} 
        onReady={() => console.log('Navigation container is ready')}
      >
        <RootStack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}
        >
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Main" component={MainStack} />
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