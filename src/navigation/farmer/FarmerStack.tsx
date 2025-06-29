/**
 * Farmer Stack Navigator
 * Contains all screens related to farmers
 */

import React from 'react';
import { View, Animated, Platform, Dimensions, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';

// Components
import { FarmerHomeScreen } from '../../components/home';
import { RequestsScreen } from '../../components/requests';
import { AddFruitScreen, PhotoUploadScreen, PriceSelectionScreen, ProductDetailScreen } from '../../components/products';

// Hooks
import { useAppStore } from '../../store';
import { useNavigationControl } from '../NavigationProvider';

// Types
import { MainTabParamList, FruitStackParamList, ProductStackParamList } from '../../types';

// Constants
import { Colors } from '../../constants';

const MainTab = createBottomTabNavigator<MainTabParamList>();
const FruitStack = createStackNavigator<FruitStackParamList>();
const ProductStack = createStackNavigator<ProductStackParamList>();
const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

// Enhanced Tab Bar Component for Farmer
const CustomFarmerTabIcon = ({ focused, color, size, route }: any) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const bounceValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(animatedValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(scaleValue, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(bounceValue, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(animatedValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(bounceValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [focused]);

  // Special handling for AddFruit tab (center FAB)
  if (route.name === 'AddFruit') {
    return (
      <Animated.View style={[
        farmerStyles.fabContainer,
        {
          transform: [
            { scale: scaleValue },
            { translateY: bounceValue }
          ]
        }
      ]}>
        <View style={farmerStyles.fabButton}>
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </View>
      </Animated.View>
    );
  }

  let iconComponent;
  switch (route.name) {
    case 'Home':
      iconComponent = focused ? (
        <MaterialIcons name="home-filled" size={size + 2} color={color} />
      ) : (
        <Octicons name="home" size={size} color={color} />
      );
      break;
    case 'Requests':
      iconComponent = focused ? (
        <FontAwesome6 name="cart-shopping" size={size-4} color={color} />
        // <Feather name="shopping-cart" size={size} color={color} />
      ) : (
        <Feather name="shopping-cart" size={size} color={color} />
      );
      break;
    default:
      iconComponent = <Ionicons name="ellipse" size={size} color={color} />;
  }

  return (
    <Animated.View
      style={[
        farmerStyles.tabIconContainer,
        {
          transform: [
            { scale: scaleValue },
            { translateY: bounceValue }
          ]
        }
      ]}
    >
      <Animated.View
        style={[
          farmerStyles.activeTabBackground,
          {
            opacity: animatedValue,
            transform: [{ scale: animatedValue }]
          }
        ]}
      />

      <View style={farmerStyles.iconWrapper}>
        {iconComponent}
      </View> 
    </Animated.View>
  );
};

// New Fruit Navigator - Specific to farmers
const NewFruitNavigator = () => (
  <FruitStack.Navigator screenOptions={{ headerShown: false }}>
    <FruitStack.Screen name="AddFruit" component={AddFruitScreen} />
    <FruitStack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
    <FruitStack.Screen name="PriceSelection" component={PriceSelectionScreen} />
  </FruitStack.Navigator>
);

// Product Flow Navigator - For viewing and managing products
const ProductFlowNavigator = () => (
  <ProductStack.Navigator screenOptions={{ headerShown: false }}>
    <ProductStack.Screen name="ProductDetail" component={ProductDetailScreen} />
  </ProductStack.Navigator>
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
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.light.primaryDark,
        tabBarInactiveTintColor: Colors.light.gray,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 6,
          marginBottom: Platform.OS === 'ios' ? 2 : 4,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? (isSmallScreen ? 100 : 115) : 90,
          position: 'absolute',
          left: 15,
          right: 15,
          borderRadius: 25,
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : '#ffffff',
          borderTopWidth: 0,
          shadowColor: '#fff',
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: -8 },
          shadowRadius: 20,
          elevation: 15,
          transform: [{
            translateY: tabBarAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [120, 0],
            }),
          }],
          display: tabBarVisible ? 'flex' : 'none',
          paddingHorizontal: 10,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 5,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              style={farmerStyles.blurBackground}
              blurType={isDark ? 'materialDark' : 'materialLight'}
              blurAmount={15}
              reducedTransparencyFallbackColor={isDark ? '#1C1C1E' : '#FFFFFF'}
            />
          ) : (
            <View style={[
              farmerStyles.androidBackground,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
            ]} />
          ),
        tabBarIcon: ({ focused, color, size }) => (
          <CustomFarmerTabIcon
            focused={focused}
            color={color}
            size={size}
            route={route}
          />
        ),
      })}
    >
      <MainTab.Screen
        name="Home"
        component={FarmerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home Tab'
        }}
      />
      <MainTab.Screen
        name="AddFruit"
        component={NewFruitNavigator}
        options={{
          tabBarLabel: 'Add Fruits',
          tabBarAccessibilityLabel: 'Add Fruits Tab'
        }}
      />
      <MainTab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarAccessibilityLabel: 'Requests Tab'
        }}
      />
    </MainTab.Navigator>
  );
};

const farmerStyles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    position: 'relative',
  },
  activeTabBackground: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 22.5,
    backgroundColor: Colors.light.primaryDark + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -20,
  },
  fabButton: {
    width: 68,
    height: 68,
    borderRadius: 60,
    backgroundColor: Colors.light.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    // elevation: 8,
    borderColor: '#DFF1E6',
  },
  blurBackground: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  androidBackground: {
    flex: 1,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 15,
  },
});

export default FarmerStack;
