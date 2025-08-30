/**
 * Root Navigator - Optimized Version
 * Main entry point for app navigation with consistent state mana  // Optimized navigation re-mount with throttling - only when necessary
  const forceNavigationReMount = useCallback(() => {
    setNavigationKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 Force navigation re-mount:', newKey);
      return newKey;
    });
  }, []);

  useEffect(() => {
    // Only process when not loading and bootstrap is ready
    if (!isLoading && bootstrapState.isReady) {
      const currentTime = Date.now();
      const timeSinceLastUpdate = currentTime - lastAuthUpdate;
      
      // Throttle re-mounts to prevent excessive renders (minimum 500ms between updates)
      if (timeSinceLastUpdate > 500) {
        lastAuthUpdate = currentTime;
        
        console.log('🔄 Auth state evaluation:', {
          isFullyAuthenticated: authState.isFullyAuthenticated,
          previousState: previousAuthState,
          stateChanged: authState.isFullyAuthenticated !== previousAuthState,
          timeSinceLastUpdate,
          shouldTriggerReMount: authState.isFullyAuthenticated !== previousAuthState
        });
        
        // Only re-mount if there's a significant authentication state change
        if (authState.isFullyAuthenticated !== previousAuthState) {
          previousAuthState = authState.isFullyAuthenticated;
          forceNavigationReMount();
        }
      }
    }
  }, [authState.isFullyAuthenticated, authState.userRole, isLoading, bootstrapState.isReady, forceNavigationReMount]);

  // Handle cases where user role might be missing but user is authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.hasValidFirebaseAuth && !authState.hasValidRole && !isLoading) {
      console.log('⚠️ User authenticated but role missing, attempting to refresh user role');
      refreshUserRole?.();
    }
  }, [authState.isAuthenticated, authState.hasValidFirebaseAuth, authState.hasValidRole, isLoading, refreshUserRole]);Firebase sync with bootstrap and context states
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import ReviewTestScreen from '../components/test/ReviewTestScreen';

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

  // Optimized navigation re-mount - only when necessary
  useEffect(() => {
    // Only force re-mount when there's a significant auth state change
    const stateChanged = 
      (authState.isAuthenticated !== (isAuthenticated || bootstrapState.isAuthenticated)) ||
      (authState.userRole !== (userRole || bootstrapState.userRole));
    
    if (stateChanged && !isLoading) {
      console.log('� Significant auth state change detected, re-mounting navigation:', {
        previousAuth: isAuthenticated || bootstrapState.isAuthenticated,
        currentAuth: authState.isAuthenticated,
        previousRole: userRole || bootstrapState.userRole,
        currentRole: authState.userRole,
        navigationKey: navigationKey + 1
      });
      
      setNavigationKey(prev => prev + 1);
    }
  }, [authState.isAuthenticated, authState.userRole, isLoading]);

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

  return (
    <NavigationProvider>
      <NavigationContainer
        key={navigationKey}
        ref={navigationRef}
        onReady={() => {
          isNavigationReady.current = true;
          console.log('🧭 Navigation ready - Complete state sync:', {
            initialRoute: initialRouteName,
            isAuthenticated: authState.isAuthenticated,
            userRole: authState.userRole,
            hasFirebaseAuth: authState.hasValidFirebaseAuth,
            hasValidRole: authState.hasValidRole,
            isFullyAuth: authState.isFullyAuthenticated,
            stackComponent: MainStackComponent.name || 'Unknown',
            navigationKey,
            authSource: authState.authSource
          });
          
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
          screenOptions={{ headerShown: false }}
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
          <RootStack.Screen name="ReviewTest" component={ReviewTestScreen} options={{ headerShown: true, title: 'Review System Test' }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </NavigationProvider>
  );
};

export default AppNavigator;