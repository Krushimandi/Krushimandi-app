import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Animated, Platform, Dimensions, StyleSheet, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import MaterialDesignIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';

// Screens
import { BuyerHomeScreen, RequestsScreen} from '../../components/home';
import { MyOrdersScreen } from '../../components/orders';

// Hooks
import { useAppStore } from '../../store';
import { useNavigationControl } from '../NavigationProvider';

// Types
import { BuyerTabParamList } from '../../types';

// Constants
import { Colors } from '../../constants';

const BuyerTab = createBottomTabNavigator<BuyerTabParamList>();
const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

// Enhanced Tab Bar Component
const CustomTabBarIcon = ({ focused, color, size, route }: any) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const bounceValue = React.useRef(new Animated.Value(0)).current;

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
  let iconName = '';

  switch (route.name) {
    case 'Home':
      iconComponent = focused ? (
        <MaterialIcons name="home-filled" size={size - 2} color={color} />
      ) : (
        <Octicons name="home" size={size} color={color} />
      );
      iconName = 'Home';
      break;
    case 'Orders':
      iconComponent = focused ? (
        <MaterialDesignIcons name="shopping" size={size - 2} color={color} />
      ) : (
        <MaterialDesignIcons name="shopping-outline" size={size} color={color} />
      );
      iconName = 'Orders';
      break;
    case 'Requests':
      iconComponent = focused ? (
        <Ionicons name="chatbox-ellipses" size={size - 2} color={color} />
      ) : (
        <Ionicons name="chatbox-ellipses-outline" size={size} color={color} />
      );
      iconName = 'Requests';
      break;
    default:
      iconComponent = <Ionicons name="ellipse" size={size} color={color} />;
      iconName = route.name;
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

const BuyerStack = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const { tabBarVisible, tabBarAnimation } = useNavigationControl();

  return (
    <BuyerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.light.primaryDark,
        tabBarInactiveTintColor: '#8E8E93',
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
        name="Orders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarAccessibilityLabel: 'My Orders Tab'
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
    </BuyerTab.Navigator>
  );
};

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

export default BuyerStack;