/**
 * App Bootstrap Screen
 * Handles complete app initialization including auth state, user profile loading
 * Shows during splash screen with loading indicators
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Colors, Typography } from '../../constants';
import { authBootstrap, AuthBootstrapState } from '../../utils/authBootstrap';

interface AppBootstrapScreenProps {
  onBootstrapComplete: (state: AuthBootstrapState) => void;
  minimumSplashTime?: number; // Minimum time to show splash in ms
}

export const AppBootstrapScreen: React.FC<AppBootstrapScreenProps> = ({
  onBootstrapComplete,
  minimumSplashTime = 1000, // Default 1 second minimum splash
}) => {
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    startBootstrap();
  }, []);

  const startBootstrap = async () => {
    const startTime = Date.now();

    try {
      // Step 1: Initialize auth system
      setLoadingText('Loading authentication...');
      setProgress(0.2);
      animateProgress(0.2);

      // Step 2: Bootstrap auth state
      setLoadingText('Restoring user session...');
      setProgress(0.5);
      animateProgress(0.5);

      const bootstrapState = await authBootstrap.initialize({
        maxWaitTime: 8000,
        enableDebugLogs: __DEV__,
      });

      // Step 3: Profile loading
      if (bootstrapState.isAuthenticated) {
        setLoadingText('Loading user profile...');
        setProgress(0.8);
        animateProgress(0.8);
      } else {
        setLoadingText('Setting up app...');
        setProgress(0.8);
        animateProgress(0.8);
      }

      // Step 4: Complete
      setLoadingText('Almost ready...');
      setProgress(1.0);
      animateProgress(1.0);

      // Ensure minimum splash time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumSplashTime - elapsedTime);

      if (remainingTime > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, remainingTime));
      }

      setIsComplete(true);

      // Exit animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onBootstrapComplete(bootstrapState);
      });

    } catch (error) {
      console.error('Bootstrap failed:', error);

      // Even if bootstrap fails, continue with default state
      const failedState: AuthBootstrapState = {
        isReady: true,
        isAuthenticated: false,
        user: null,
        userRole: null,
        token: null,
        error: error instanceof Error ? error.message : 'Initialization failed',
      };

      setLoadingText('Continuing with limited features...');
      setProgress(1.0);
      animateProgress(1.0);

      setTimeout(() => {
        onBootstrapComplete(failedState);
      }, 1000);
    }
  };

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Image style={styles.logoText}
              source={require('../../assets/images/logo1.png')} />
          </View>
        </View>

        {/* Loading Section */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>{loadingText}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isComplete ? '✅ Ready!' : '⏳ Please wait...'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    width: 250,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 24,
    fontFamily: Typography.fontFamily.medium,
  },
  progressBarContainer: {
    alignItems: 'center',
    width: width * 0.6,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
});

export default AppBootstrapScreen;
