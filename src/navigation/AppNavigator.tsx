import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getFocusedRouteNameFromRoute, NavigationContainer, useNavigation, useNavigationState } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef, isNavigationReady, pendingNotificationData, handleNotificationNavigation } from './navigationService';
import { notificationTabEmitter } from './buyer/notificationTabEmitter';

// Screen components
import LoadingScreen from '../components/common/LoadingScreen';
import { NotificationScreen, NotificationDetail } from '../components/notification';
import { SettingsScreen } from '../components/settings';
import BuyerProfileScreen from '../components/ProfileScreen/BuyerProfileScreen';
import EditProfileScreen from '../components/ProfileScreen/EditProfileScreen';
import AboutScreen from '../components/ProfileScreen/AboutScreen';
import HelpScreen from '../components/Help/HelpScreen';
import HelpGuide from '../components/Help/HelpGuide';
import FaqDetail from '../components/Help/FaqDetail';
import LanguagesScreen from '../components/ProfileScreen/LanguagesScreen';
import PrivacyPolicyScreen from '../components/ProfileScreen/PrivacyPolicyScreen';

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RootStack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  bootstrapState: AuthBootstrapState;
}

interface ConsolidatedAuthState {
  isAuthenticated: boolean;
  userRole: 'farmer' | 'buyer' | null;
  user: any | null;
  hasValidFirebaseAuth: boolean;
  hasValidRole: boolean;
  isFullyAuthenticated: boolean;
  shouldShowMainApp: boolean;
  authSource: 'context' | 'bootstrap';
}

// Static properties for tracking state changes and preventing excessive re-renders
let lastAuthUpdate = 0;
let previousAuthState: boolean | null = null;

// Root Navigator - Optimized
const AppNavigator: React.FC<AppNavigatorProps> = ({ bootstrapState }) => {
  const { isAuthenticated, userRole, isLoading, user, refreshUserRole } = useAuthState();
  const [navigationKey, setNavigationKey] = useState(0);

  // Memoized auth state consolidation - single source of truth
  const authState: ConsolidatedAuthState = useMemo(() => {
    // Priority: Context state (includes Firebase sync) > Bootstrap state
    const contextAuth = isAuthenticated !== null && isAuthenticated !== undefined ? isAuthenticated : null;
    const finalIsAuthenticated = contextAuth !== null ? contextAuth : bootstrapState.isAuthenticated;
    const finalUserRole = userRole || bootstrapState.userRole;
    const finalUser = user || bootstrapState.user;

    // Enhanced validation for proper authentication state
    const hasValidFirebaseAuth = finalUser && finalUser.uid;
    const hasValidRole = finalUserRole && (finalUserRole === 'buyer' || finalUserRole === 'farmer');
    const isFullyAuthenticated = finalIsAuthenticated && hasValidFirebaseAuth && hasValidRole;

    return {
      isAuthenticated: finalIsAuthenticated,
      userRole: finalUserRole,
      user: finalUser,
      hasValidFirebaseAuth: !!hasValidFirebaseAuth,
      hasValidRole: !!hasValidRole,
      isFullyAuthenticated,
      shouldShowMainApp: isFullyAuthenticated,
      authSource: contextAuth !== null ? 'context' : 'bootstrap'
    };
  }, [isAuthenticated, userRole, user, bootstrapState.isAuthenticated, bootstrapState.userRole, bootstrapState.user]);

  // Optimized logging with better state visibility
  console.log('🔍 AppNavigator - Consolidated Auth State:', {
    source: authState.authSource,
    contextAuth: isAuthenticated,
    contextRole: userRole,
    contextUser: !!user,
    bootstrapAuth: bootstrapState.isAuthenticated,
    bootstrapRole: bootstrapState.userRole,
    bootstrapUser: !!bootstrapState.user,
    bootstrapReady: bootstrapState.isReady,
    finalAuth: authState.isAuthenticated,
    finalRole: authState.userRole,
    hasValidFirebaseAuth: authState.hasValidFirebaseAuth,
    hasValidRole: authState.hasValidRole,
    isFullyAuthenticated: authState.isFullyAuthenticated,
    shouldShowMainApp: authState.shouldShowMainApp,
    isLoading,
    navigationKey
  });

  // Re-mount navigator when fully-authenticated state or role actually changes
  const prevAuthRef = useRef<boolean | null>(null);
  const prevRoleRef = useRef<'farmer' | 'buyer' | null>(null);
  useEffect(() => {
    const prevAuth = prevAuthRef.current;
    const prevRole = prevRoleRef.current;
    const authChanged = prevAuth !== null && authState.isFullyAuthenticated !== prevAuth;
    const roleChanged = prevRole !== null && authState.userRole !== prevRole;

    if ((authChanged || roleChanged) && !isLoading) {
      console.log('🔄 Auth/Role change detected, re-mounting navigation:', {
        prevAuth,
        currAuth: authState.isFullyAuthenticated,
        prevRole,
        currRole: authState.userRole,
        nextKey: navigationKey + 1
      });
      setNavigationKey(prev => prev + 1);
    }

    prevAuthRef.current = authState.isFullyAuthenticated;
    prevRoleRef.current = authState.userRole;
  }, [authState.isFullyAuthenticated, authState.userRole, isLoading]);

  // Optimized stack component selection with memoization
  const getMainStackComponent = useCallback(() => {
    if (!authState.isFullyAuthenticated) {
      console.log('⚠️ Not fully authenticated, routing to AuthNavigator:', {
        isAuthenticated: authState.isAuthenticated,
        hasFirebaseAuth: authState.hasValidFirebaseAuth,
        hasRole: authState.hasValidRole
      });
      return AuthNavigator;
    }

    // return FarmerStack;
    switch (authState.userRole) {
      case 'buyer':
        console.log('📱 Routing to BuyerStack for buyer role');
        return BuyerStack;
      case 'farmer':
        console.log('🌾 Routing to FarmerStack for farmer role');
        return FarmerStack;
      default:
        console.warn('⚠️ Invalid or missing user role, routing to AuthNavigator:', authState.userRole);
        return AuthNavigator;
    }
  }, [authState.isFullyAuthenticated, authState.userRole, authState.isAuthenticated, authState.hasValidFirebaseAuth, authState.hasValidRole]);

  // Show loading while authentication state is being determined
  if (isLoading || !bootstrapState.isReady) {
    console.log('⏳ Showing loading screen:', {
      isLoading,
      bootstrapReady: bootstrapState.isReady,
      reason: !bootstrapState.isReady ? 'Bootstrap not ready' : 'Auth loading'
    });
    return <LoadingScreen />;
  }

  // Determine routing with enhanced logic
  const initialRouteName = authState.shouldShowMainApp ? "Main" : "Auth";
  const MainStackComponent = getMainStackComponent();

  console.log('🚀 AppNavigator - Final Navigation Setup:', {
    initialRouteName,
    stackComponent: authState.userRole ? `${authState.userRole}Stack` : 'AuthStack',
    navigationKey,
    authStateValid: authState.isFullyAuthenticated,
    hasFirebaseSync: authState.authSource === 'context'
  });

  const insets = useSafeAreaInsets();
  return (
    <NavigationProvider>
      <NavigationContainer
        key={navigationKey}
        ref={navigationRef}
        onReady={() => {
          isNavigationReady.current = true;
          // Handle pending notifications with auth state validation
          if (pendingNotificationData.current) {
            if (authState.isFullyAuthenticated) {
              console.log('📱 Processing pending notification with valid auth state');
              handleNotificationNavigation(pendingNotificationData.current, notificationTabEmitter);
              pendingNotificationData.current = null;
            } else {
              console.log('⚠️ Pending notification found but user not fully authenticated, deferring');
            }
          }
        }}
      >
        <RootStack.Navigator
          screenOptions={({ route }) => {
            // Default fullscreen nahi
            let isFullScreen = false;

            // Ye direct RootStack screens ke liye
            const fullScreenList = ['Welcome', 'Auth'];

            if (fullScreenList.includes(route.name)) {
              isFullScreen = true;
            }

            // for Nested Stack
            if (route.name === 'Main') {
              const nestedRoute = getFocusedRouteNameFromRoute(route) ?? '';
              const nestedFullScreens = ['FruitsScreen'];
              if (nestedFullScreens.includes(nestedRoute)) {
                isFullScreen = true;
              }
            }

            return {
              headerShown: false,
              cardStyle: { paddingBottom: isFullScreen ? 0 : insets.bottom * 0.6, backgroundColor: '#FFFFFF' },
            };
          }}

          initialRouteName={initialRouteName}
        >
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Main" component={MainStackComponent} />
          <RootStack.Screen name="Notification" component={NotificationScreen} />
          <RootStack.Screen name="NotificationDetail" component={NotificationDetail as React.ComponentType<any>} />
          <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
          <RootStack.Screen name="About" component={AboutScreen} />
          <RootStack.Screen name="HelpScreen" component={HelpScreen} />
          <RootStack.Screen name="FaqDetail" component={FaqDetail} />
          <RootStack.Screen name="HelpGuide" component={HelpGuide} />
          <RootStack.Screen name="Languages" component={LanguagesScreen} />
          <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <RootStack.Screen name="ProfileSettings" component={SettingsScreen} />
          <RootStack.Screen name="ProfileScreen" component={SettingsScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="BuyerProfile" component={BuyerProfileScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </NavigationProvider >
  );
};

export default AppNavigator;