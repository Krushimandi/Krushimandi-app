/**
 * Splash Screen Component
 * Shows app logo and handles initial app loading
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, useAppStore } from '../../store';
import { Colors, APP_CONFIG } from '../../constants';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated, token } = useAuthStore();
  const { isOnboardingComplete, theme } = useAppStore();
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  useEffect(() => {
    // Start logo animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after splash timeout
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, APP_CONFIG.SPLASH_TIMEOUT);

    return () => clearTimeout(timer);
  }, [isOnboardingComplete, isAuthenticated, token]);
  const checkAuthAndNavigate = async () => {
    try {      if (!isOnboardingComplete) {
        // Use direct navigation for Onboarding since it might not be in RootStackParamList
        (navigation as any).navigate('Onboarding');
      } else if (isAuthenticated && token) {
        // Import and use our navigation utility to avoid reset errors
        import('../../utils/navigationUtils').then(({ navigateToMain }) => {
          navigateToMain();
        });
      } else {
        // Import and use our navigation utility to avoid reset errors
        import('../../utils/navigationUtils').then(({ navigateToAuth }) => {
          navigateToAuth();
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      (navigation as any).navigate('Auth');
    }
  };

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
        translucent
      />
      
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >        <Image
          source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={[styles.appName, { color: textColor }]}>
          {APP_CONFIG.APP_NAME}
        </Text>
        
        <Text style={[styles.tagline, { color: textColor }]}>
          Connecting Farmers & Buyers
        </Text>
      </Animated.View>
      
      <View style={styles.footer}>
        <Text style={[styles.version, { color: textColor }]}>
          Version {APP_CONFIG.VERSION}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    opacity: 0.5,
  },
});

export default SplashScreen;
