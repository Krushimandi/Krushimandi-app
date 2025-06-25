/**
 * Farmer Stack Navigator
 * Contains all screens related to farmers
 */

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Components
import { FarmerHomeScreen } from '../../components/home';
import { RequestsScreen } from '../../components/requests';
import { AddFruitScreen, PhotoUploadScreen, PriceSelectionScreen } from '../../components/products';

// Hooks
import { useAppStore } from '../../store';
import { useNavigationControl } from '../NavigationProvider';

// Types
import { MainTabParamList, FruitStackParamList } from '../../types';

// Constants
import { Colors } from '../../constants';

const MainTab = createBottomTabNavigator<MainTabParamList>();
const FruitStack = createStackNavigator<FruitStackParamList>();

// New Fruit Navigator - Specific to farmers
const NewFruitNavigator = () => (
  <FruitStack.Navigator screenOptions={{ headerShown: false }}>
    <FruitStack.Screen name="AddFruit" component={AddFruitScreen} />
    <FruitStack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
    <FruitStack.Screen name="PriceSelection" component={PriceSelectionScreen} />
  </FruitStack.Navigator>
);

// Farmer Tab Navigator
const FarmerStack = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const { tabBarVisible, tabBarAnimation } = useNavigationControl();

  return (
    <MainTab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              return <Octicons name="home" size={22} color={color} />;
            case 'AddFruit':
              return <MaterialIcons name="post-add" size={22} color={color} />;
            case 'Requests':
              return <Feather name="shopping-cart" size={22} color={color} />;
            default:
              return <Ionicons name="circle" size={22} color={color} />;
          }
        },
        tabBarActiveTintColor: Colors.light.primaryDark,
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          height: 92,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          position: 'absolute',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 5,
          elevation: 10,
          paddingBottom: 16,
          paddingTop: 8,
          transform: [{
            translateY: tabBarAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0]
            })
          }],
          // Hide tab bar when animation completes and tabBarVisible is false
          display: tabBarVisible ? 'flex' : 'none',
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >      <MainTab.Screen
        name="Home"
        component={FarmerHomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <MainTab.Screen
        name="AddFruit"
        component={NewFruitNavigator}
        options={{
          tabBarLabel: 'Add Fruits', tabBarIcon: ({ focused, color }) => (
            <View style={{
              width: 68,
              height: 68,
              borderRadius: 60,
              backgroundColor: Colors.light.primaryDark,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 48,
              borderWidth: 4,
              borderColor: '#FFFFFF',
              shadowColor: Colors.light.primaryDark,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}>
              <Ionicons name="storefront" size={22} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <MainTab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: 'Requests',
        }}
      />
    </MainTab.Navigator>
  );
};

export default FarmerStack;
