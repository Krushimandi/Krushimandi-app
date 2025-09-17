import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Animated, Platform, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import MaterialDesignIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';

// Screens
import { BuyerHomeScreen, RequestsScreen } from '../../components/home';
// Removed MyOrdersScreen (orders now merged into Requests)
import ChatListScreen from '../../components/chat/ChatListScreen';
import { ProductDetailScreen } from '../../components/products';
import { FruitsScreen } from '../../components/auth';
import NotificationBadge from '../../components/common/NotificationBadge';
import { useOrdersBadgeStore } from '../../store';

// Hooks
import { useAppStore } from '../../store';
import { useNavigationControl } from '../NavigationProvider';

// Types
import { BuyerTabParamList, BuyerStackParamList } from '../types';

// Constants
import { Colors } from '../../constants';

const BuyerTab = createBottomTabNavigator<BuyerTabParamList>();
const BuyerMainStack = createStackNavigator<BuyerStackParamList>();
const isSmallScreen = false; // If you want to support small screens, use Dimensions API only in React Native

// Enhanced Tab Bar Component
const CustomTabBarIcon = ({ focused, color, size, route }: any) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const bounceValue = React.useRef(new Animated.Value(0)).current;
  const unseenOrders = useOrdersBadgeStore(s => s.unseenCount);

  React.useEffect(() => {
    if (focused) {
      // Scale and bounce animation for focused tab
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

  let iconComponent;

  switch (route.name) {
    case 'Home':
      iconComponent = focused ? (
        <MaterialIcons name="home-filled" size={size + 2} color={color} />
      ) : (
        <Octicons name="home" size={size} color={color} />
      );
      break;
    case 'Chats':
      iconComponent = focused ? (
        <Ionicons name="chatbox-ellipses" size={size - 2} color={color} />
      ) : (
        <Ionicons name="chatbox-ellipses-outline" size={size} color={color} />
      );
      break;
    case 'Requests':
      iconComponent = (
        <View style={{ position: 'relative' }}>
          {focused ? (
            <MaterialDesignIcons name="comment-account" size={size} color={color} />
          ) : (
            <MaterialDesignIcons name="comment-account-outline" size={size + 2} color={color} />
          )}
        </View>
      );
      break;
    default:
      iconComponent = <Ionicons name="ellipse" size={size} color={color} />;
  }

  return (
    <Animated.View
      style={[
        styles.tabIconContainer,
        {
          transform: [
            { scale: scaleValue },
            { translateY: bounceValue }
          ]
        }
      ]}
    >
      {/* Background highlight for active tab */}
      <Animated.View
        style={[
          styles.activeTabBackground,
          {
            opacity: animatedValue,
            transform: [{ scale: animatedValue }]
          }
        ]}
      />

      {/* Icon */}
      <View style={styles.iconWrapper}>
        {iconComponent}
      </View>

      {/* Enhanced active indicator */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            opacity: animatedValue,
            transform: [{ scaleX: animatedValue }]
          }
        ]}
      />
    </Animated.View>
  );
};

// Buyer Tab Navigator Component
const BuyerTabNavigator = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const { tabBarVisible, tabBarAnimation } = useNavigationControl();

  return (
    <BuyerTab.Navigator
      initialRouteName={'Home'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.light.primaryDark,
        tabBarInactiveTintColor: Colors.light.gray,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 8,
          marginBottom: Platform.OS === 'ios' ? 2 : 4,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? (isSmallScreen ? 100 : 115) : 90,
          position: 'absolute',
          left: 15,
          right: 15,
          borderRadius: 25,
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          shadowColor: isDark ? '#000000' : '#000000',
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
          paddingBottom: Platform.OS === 'ios' ? 8 : 12,
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
              style={styles.blurBackground}
              blurType={isDark ? 'materialDark' : 'materialLight'}
              blurAmount={15}
              reducedTransparencyFallbackColor={isDark ? '#1C1C1E' : '#FFFFFF'}
            />
          ) : (
            <View style={[
              styles.androidBackground,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
            ]} />
          ),
        tabBarIcon: ({ focused, color, size }) => (
          <CustomTabBarIcon
            focused={focused}
            color={color}
            size={size + 2}
            route={route}
          />
        ),
      })}
    >
      <BuyerTab.Screen
        name="Home"
        component={BuyerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home Tab'
        }}
      />
      <BuyerTab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarAccessibilityLabel: 'Requests Tab'
        }}
      />
      <BuyerTab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Chats',
          tabBarAccessibilityLabel: 'Chats Tab'
        }}
      />
    </BuyerTab.Navigator>
  );
};

// Main Buyer Stack with Product Detail Screen
const BuyerStack = () => (
  <BuyerMainStack.Navigator screenOptions={{ headerShown: false }}>
    <BuyerMainStack.Screen name="BuyerTabs" component={BuyerTabNavigator} />
    <BuyerMainStack.Screen name="ProductDetail" component={ProductDetailScreen as React.ComponentType<any>} />
    <BuyerMainStack.Screen name="FruitsScreen" component={FruitsScreen as React.ComponentType<any>} />
  </BuyerMainStack.Navigator>
);

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    position: 'relative',
  },
  activeTabBackground: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 22.5,
    backgroundColor: Colors.light.primaryDark + '15', // 15% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 3,
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 2,
    zIndex: 1,
  },
  blurBackground: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  androidBackground: {
    flex: 1,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
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

export default BuyerStack;