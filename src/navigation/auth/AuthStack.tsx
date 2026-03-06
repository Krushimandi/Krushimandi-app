/**
 * Authentication Navigation Stack
 * Handles all authentication related screens
 */

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { authFlowManager } from '../../services/authFlowManager';

// Auth Screen Components
import {
  WelcomeScreen,
  MobileScreen,
  OTPVerificationScreen,
  RoleSelectionScreen,
  IntroduceYourselfScreen,
  FruitsScreen,
} from '../../components/auth';
import { AuthProvider } from '../../contexts/AuthContext';

// Types
import { AuthStackParamList } from '../../types';

const AuthStack = createStackNavigator<AuthStackParamList>();

// Auth Navigator
const AuthNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof AuthStackParamList>('Welcome');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        // Use auth flow manager to determine initial route
        const route = await authFlowManager.resumeAuthFlow();



        if (mounted) {
          if (route.screen === 'Main') {
            // User is fully authenticated, redirect to main app
            const { navigateToMain } = await import('../../utils/navigationUtils');
            navigateToMain();
            return;
          }

          // Map auth flow route to AuthStack screen
          let authScreen: keyof AuthStackParamList = 'Welcome';

          switch (route.screen) {
            case 'Welcome':
              authScreen = 'Welcome';
              break;
            case 'MobileScreen':
              authScreen = 'MobileScreen';
              break;
            case 'OTPVerification':
              authScreen = 'OTPVerification';
              break;
            case 'RoleSelection':
              authScreen = 'RoleSelection';
              break;
            case 'IntroduceYourself':
              authScreen = 'IntroduceYourself';
              break;
            case 'FruitsScreen':
              authScreen = 'FruitsScreen';
              break;
            default:
              authScreen = 'Welcome';
          }

          setInitialRoute(authScreen);
          setReady(true);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setInitialRoute('Welcome');
          setReady(true);
        }
      }
    };

    initializeAuth();
    return () => { mounted = false; };
  }, []);

  if (!ready) return null;

  return (
    <AuthProvider>
      <AuthStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}>
        <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
        <AuthStack.Screen name="MobileScreen" component={MobileScreen} />
        <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <AuthStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <AuthStack.Screen name="IntroduceYourself" component={IntroduceYourselfScreen} />
        <AuthStack.Screen name="FruitsScreen" component={FruitsScreen} />
      </AuthStack.Navigator>
    </AuthProvider>
  );
};

// Helper: Map currentStep to AuthStack screen
export const getAuthScreen = (step: string) => {

  switch (step) {
    case 'welcome':
      return 'Welcome';
    case 'phone_verification':
      return 'MobileScreen';
    case 'role_selection':
      return 'RoleSelection';
    case 'profile_setup':
      return 'IntroduceYourself';
    case 'fruits_selection':
      return 'FruitsScreen';
    default:
      return 'Welcome';
  }
};

export default AuthNavigator;
