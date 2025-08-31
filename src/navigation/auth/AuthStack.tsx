/**
 * Authentication Navigation Stack
 * Handles all authentication related screens
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

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
  return (
    <AuthProvider>
      <AuthStack.Navigator
        initialRouteName="Welcome"
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
