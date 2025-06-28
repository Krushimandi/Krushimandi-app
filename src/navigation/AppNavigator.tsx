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
import { authStateManager } from '../utils/authStateManager';

// Screen components
import LoadingScreen from '../components/common/LoadingScreen';
import { NotificationScreen, NotificationDetail } from '../components/notification';
import { SettingsScreen } from '../components/settings';
import { ProfileScreen } from '../components/profile';
import { ProductDetailScreen } from '../components/products';

// Navigation provider
import { NavigationProvider } from './NavigationProvider';

// Navigation stacks
import AuthNavigator, { getAuthScreen } from './auth/AuthStack';
import FarmerStack from './farmer/FarmerStack';
import BuyerStack from './buyer/BuyerStack';

// Types
import { RootStackParamList, ProductStackParamList } from './types';

// Store
import { useAuthStore } from '../store';

const RootStack = createStackNavigator<RootStackParamList>();
const ProductStack = createStackNavigator<ProductStackParamList>();

// ProductFlow Navigator
const ProductFlowNavigator = () => (
  <ProductStack.Navigator screenOptions={{ headerShown: false }}>
    <ProductStack.Screen 
      name="ProductDetail" 
      component={ProductDetailScreen as React.ComponentType<any>} 
    />
  </ProductStack.Navigator>
);

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

    // Listen to Firebase auth state changes
    const unsubscribeAuth = auth().onAuthStateChanged(async () => {
      await checkAuthState();
    });

    // Listen to auth state manager for other changes (like auth step completion)
    const unsubscribeAuthManager = authStateManager.addListener((authState) => {
      console.log('🔄 Auth state updated via manager:', authState);
      setAuthState(authState);
      setLoading(false);
    });

    checkAuthState();

    return () => {
      unsubscribeAuth();
      unsubscribeAuthManager();
    };
  }, []);

  // Effect to handle navigation when auth state changes
  React.useEffect(() => {
    if (!authState || loading) return;

    const shouldShowMainApp = authState.isAuthenticated && 
      authState.profileCompleted && 
      authState.nextRoute === 'Main';

    if (navigationRef.isReady()) {
      if (shouldShowMainApp) {
        console.log('🚀 Navigating to Main app');
        navigationRef.navigate('Main');
      } else {
        console.log('🔐 Navigating to Auth flow');
        navigationRef.navigate('Auth');
      }
    }
  }, [authState, loading]);
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

  console.log('🔍 AppNavigator render - Auth State:', {
    isAuthenticated: authState.isAuthenticated,
    phoneVerified: authState.phoneVerified,
    roleSelected: authState.roleSelected,
    profileCompleted: authState.profileCompleted,
    currentStep: authState.currentStep,
    nextRoute: authState.nextRoute
  });

  // Choose the appropriate stack based on user role
  const MainStack = getMainComponent();

  // Determine initial route based on auth state
  const shouldShowMainApp = authState.isAuthenticated && 
    authState.profileCompleted && 
    authState.nextRoute === 'Main';

  return (
    <NavigationProvider>
      <NavigationContainer ref={navigationRef} onReady={() => console.log('Navigation container is ready')}>
        <RootStack.Navigator 
          screenOptions={{ headerShown: false }} 
          initialRouteName={shouldShowMainApp ? "Main" : "Auth"}
        >
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Main" component={MainStack} />
          <RootStack.Screen name="ProductFlow" component={ProductFlowNavigator} />
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
