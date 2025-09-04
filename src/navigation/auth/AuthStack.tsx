/**
 * Authentication Navigation Stack
 * Handles all authentication related screens
 */

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateToMain } from '../../utils/navigationUtils';

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
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      try {
        const WELCOME_KEY = '@krushimandi:onboarding_complete_v2';
        const hasSeenWelcome = await AsyncStorage.getItem(WELCOME_KEY);

        const { getAuthState } = await import('../../utils/authFlow');
        const state = await getAuthState();

        // If auth is complete, redirect to Main immediately to avoid any Auth flicker
        if (state?.nextRoute === 'Main' || state?.currentStep === 'complete') {
          navigateToMain();
          if (mounted) {
            setRedirected(true);
          }
          return;
        }

        let route: keyof AuthStackParamList = hasSeenWelcome ? 'MobileScreen' : 'Welcome';
        switch (state.currentStep) {
          case 'role_selection':
            route = 'RoleSelection';
            break;
          case 'profile_setup':
            route = 'IntroduceYourself';
            break;
          case 'fruits_selection':
            route = 'FruitsScreen' as any;
            break;
          case 'complete':
            route = 'MobileScreen';
            break;
          default:
            break;
        }
        if (mounted) {
          setInitialRoute(route);
          setReady(true);
        }
      } catch (e) {
        console.warn('AuthStack init route error:', e);
        if (mounted) {
          setInitialRoute('Welcome');
          setReady(true);
        }
      }
    };
    resolve();
    return () => { mounted = false; };
  }, []);

  if (!ready || redirected) return null;

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
  console.log('Current Auth Step:', step);
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
