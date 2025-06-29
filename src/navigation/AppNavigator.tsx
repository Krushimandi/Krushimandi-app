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
import { getCompleteUserProfile } from '../services/firebaseService';
import { getUserRole, syncUserRole, initializeUserRoleFromUserData } from '../utils/userRoleStorage';

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
  const [isProfileLoaded, setIsProfileLoaded] = React.useState(false);
  const [userRole, setUserRole] = React.useState<'farmer' | 'buyer' | null>(null);
  const authStore = useAuthStore();

  // Debug: Log the current state
  console.log('🔍 AppNavigator render - Current state:', {
    userRole,
    authStoreUser: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    authState,
    isProfileLoaded
  });

  React.useEffect(() => {
    const initializeUserRole = async () => {
      try {
        // First try to get role from localStorage
        let role = await getUserRole();

        // If no role in localStorage, try to initialize from userData
        if (!role) {
          role = await initializeUserRoleFromUserData();
        }

        if (role) {
          setUserRole(role);
          console.log('✅ User role loaded from localStorage:', role);
        } else {
          console.log('❌ No user role found in localStorage');
        }
      } catch (error) {
        console.error('❌ Error initializing user role:', error);
      }
    };

    initializeUserRole();
  }, []);

  React.useEffect(() => {
    const checkAuthState = async () => {
      try {
        const state = await getAuthState();
        if (__DEV__) await debugAuthState();
        setAuthState(state);

        // If user is authenticated, sync role and load profile
        if (state.isAuthenticated && state.profileCompleted) {
          try {
            // Sync user role between localStorage and Firestore
            const syncedRole = await syncUserRole();
            if (syncedRole && syncedRole !== userRole) {
              setUserRole(syncedRole);
              console.log('🔄 User role synced:', syncedRole);
            }

            // Load user profile for auth store
            const userProfile = await getCompleteUserProfile();
            if (userProfile) {
              console.log('🎯 Loading user profile into auth store:', {
                userType: (userProfile as any).userRole,
                firstName: (userProfile as any).firstName
              });
              authStore.updateUser({
                id: (userProfile as any).uid,
                firstName: (userProfile as any).firstName,
                lastName: (userProfile as any).lastName,
                email: (userProfile as any).email,
                phone: (userProfile as any).phoneNumber,
                userType: (userProfile as any).userRole as 'farmer' | 'buyer',
                status: 'active',
                isVerified: (userProfile as any).isVerified || true,
                createdAt: (userProfile as any).createdAt,
                updatedAt: (userProfile as any).updatedAt,
                avatar: (userProfile as any).profileImage
              });
              setIsProfileLoaded(true);
            } else {
              setIsProfileLoaded(true); // Still mark as loaded even if no profile found
            }
          } catch (profileError) {
            console.error('❌ Error loading user profile for navigation:', profileError);
            setIsProfileLoaded(true); // Mark as loaded to prevent infinite loading
          }
        } else {
          setIsProfileLoaded(true); // No profile to load for unauthenticated users
        }
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
      if (shouldShowMainApp && userRole) { // Use userRole instead of isProfileLoaded
        console.log('🚀 Navigating to Main app with role:', userRole);
        navigationRef.navigate('Main');
      } else if (!shouldShowMainApp) {
        console.log('🔐 Navigating to Auth flow');
        navigationRef.navigate('Auth');
      }
      // If shouldShowMainApp is true but role is not loaded, wait
    }
  }, [authState, loading, userRole]); // Dependency on userRole instead of isProfileLoaded
  // Choose the appropriate stack based on user role
  const getMainComponent = () => {
    console.log('🎯 getMainComponent called with userRole:', userRole);
    // return FarmerStack;
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

  if (loading || !authState) {
    return <LoadingScreen />;
  }

  // Wait for role to be loaded if user is authenticated and profile is completed
  const shouldShowMainApp = authState.isAuthenticated &&
    authState.profileCompleted &&
    authState.nextRoute === 'Main';

  if (shouldShowMainApp && !userRole) {
    console.log('⏳ Waiting for user role to load...');
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