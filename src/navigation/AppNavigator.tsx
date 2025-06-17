/**
 * Navigation Configuration
 * Defines all navigation stacks and screens
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Component Screens - Organized by Category
import {
  WelcomeScreen,
  MobileScreen,
  OTPVerificationScreen,
  RoleSelectionScreen,
  IntroduceYourselfScreen,
  PhotoUploadScreen,
} from '../components/auth';

// Product Screens
import { AddFruitScreen, ProductDetailScreen, ProductCard, ProductsListScreen } from '../components/products';

// Profile Screens
import { EditProfileScreen } from '../components/profile';

// Types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from '../types';

// Store
import { useAuthStore, useAppStore } from '../store';
import { Colors } from '../constants';

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="MobileScreen" component={MobileScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <AuthStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <AuthStack.Screen name="IntroduceYourself" component={IntroduceYourselfScreen} />
      <AuthStack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const MainTabNavigator = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <MainTab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          switch (route.name) {
            case 'AddFruit':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'EditProfile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Profile':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDark ? Colors.dark.tabBarActive : Colors.light.tabBarActive,
        tabBarInactiveTintColor: isDark ? Colors.dark.tabBarInactive : Colors.light.tabBarInactive,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.tabBarBackground : Colors.light.tabBarBackground,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      })}
    >
      <MainTab.Screen
        name="AddFruit"
        component={AddFruitScreen}
        options={{ tabBarLabel: 'Add Fruit' }}
      />
      <MainTab.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ tabBarLabel: 'Edit Profile' }}
      />
      <MainTab.Screen
        name="Profile"
        component={EditProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      <MainTab.Screen
        name="Settings"
        component={EditProfileScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </MainTab.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
