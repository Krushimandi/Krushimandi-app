// File: src/components/WelcomeScreen.jsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Dimensions
} from 'react-native';
import { isPhoneVerified, isRoleSelected, isProfileCompleted, isAuthComplete } from '../../utils/authFlow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {

  useEffect(() => {
    console.log('🔍 WelcomeScreen - useEffect triggered');
    // Check auth state and navigate to appropriate screen
    const checkAuthAndNavigate = async () => {
      try {
        // Mark welcome as seen once user reaches this screen (only first launch)
        const WELCOME_KEY = '@krushimandi:onboarding_complete_v2';
        const seen = await AsyncStorage.getItem(WELCOME_KEY);
        if (!seen) {
          await AsyncStorage.setItem(WELCOME_KEY, 'true');
        }
        const [phoneVerified, roleSelected, profileCompleted, authComplete] = await Promise.all([
          isPhoneVerified(),
          isRoleSelected(),
          isProfileCompleted(),
          isAuthComplete(),
        ]);

        console.log('🔍 WelcomeScreen - Auth state check:', {
          phoneVerified,
          roleSelected,
          profileCompleted
        });

        // If fully complete, do nothing here; AppNavigator will switch to Main automatically
        if (phoneVerified && roleSelected && profileCompleted && authComplete) {
          console.log('✅ Auth complete, awaiting AppNavigator to switch to Main');
          return;
        }
        if (phoneVerified && !roleSelected) {
          console.log('📱 Phone verified, navigating to RoleSelection');
          navigation.replace('RoleSelection');
        } else if (phoneVerified && roleSelected && !profileCompleted) {
          console.log('👤 Role selected, navigating to IntroduceYourself');
          navigation.replace('IntroduceYourself');
        }
        // If phone not verified, stay on Welcome screen
      } catch (error) {
        console.error('Error checking auth state in WelcomeScreen:', error);
      }
    };

    checkAuthAndNavigate();
  }, [navigation]);

  const handleGetStarted = () => {
    console.log('Get Started pressed');
  // Ensure flag is set when user proceeds
  AsyncStorage.setItem('@krushimandi:onboarding_complete_v2', 'true').catch(() => {});
    navigation.navigate('MobileScreen');
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&h=1200&fit=crop'
        }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Overlay */}
        <View style={styles.overlay} />
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.textContainer}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.titleText}>KrushiMandi</Text>

              <Text style={styles.descriptionText}>
                Connect farmers directly with buyers — create transparent pricing, reduce middleman costs, and build sustainable agricultural partnerships for better profits.
              </Text>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={[styles.bottomSection, { paddingBottom: insets.bottom * 0.8 }]}>
            <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 50,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 34,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    lineHeight: 38,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 0,
  },
  bottomSection: {
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: '#7ED321',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
