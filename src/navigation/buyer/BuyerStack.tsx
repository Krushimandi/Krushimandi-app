/**
 * Buyer Stack Navigator
 * Contains all screens related to buyers
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import Feather from 'react-native-vector-icons/Feather';

// Components
import BuyerHomeScreen from '../../components/home/BuyerHomeScreen.jsx';
import WatchlistScreen from '../../components/home/WatchlistScreen.jsx';
import { MyOrdersScreen } from '../../components/orders';
import { ProductsListScreen } from '../../components/products';

// Hooks
import { useAppStore } from '../../store';
import { useNavigationControl } from '../NavigationProvider';

// Types
import { BuyerTabParamList } from '../../types';

// Constants
import { Colors } from '../../constants';

const BuyerTab = createBottomTabNavigator<BuyerTabParamList>();

// Buyer Tab Navigator
const BuyerStack = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const { tabBarVisible, tabBarAnimation } = useNavigationControl();

  return (
    <BuyerTab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              return <Octicons name="home" size={22} color={color} />;
            case 'Browse':
              return <Ionicons name="search" size={24} color={color} />;
            case 'Orders':
              return <Feather name="package" size={22} color={color} />;
            case 'Watchlist':
              return <Ionicons name="heart-outline" size={22} color={color} />;
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
    >
      <BuyerTab.Screen
        name="Home"
        component={BuyerHomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <BuyerTab.Screen
        name="Browse"
        component={ProductsListScreen}
        options={{
          tabBarLabel: 'Browse',
        }}
      />
      <BuyerTab.Screen
        name="Orders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'My Orders',
        }}
      />
      <BuyerTab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          tabBarLabel: 'Watchlist',
        }}
      />
    </BuyerTab.Navigator>
  );
};

export default BuyerStack;
