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
import { authFlowManager } from '../../services/authFlowManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {

  useEffect(() => {
    console.log('🔍 WelcomeScreen - useEffect triggered');
    
    const checkAuthAndNavigate = async () => {
      try {
        // Get the next route from auth flow manager
        const route = await authFlowManager.resumeAuthFlow();
        
        console.log('🔍 WelcomeScreen - Auth flow route:', route);
        
        // If user should be elsewhere, navigate
        if (route.screen !== 'Welcome') {
          if (route.screen === 'Main') {
            console.log('✅ Auth complete, navigating to Main');
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          } else {
            console.log(`📱 Navigating to ${route.screen}`);
            if (route.params) {
              navigation.replace(route.screen, route.params);
            } else {
              navigation.replace(route.screen);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in WelcomeScreen auth check:', error);
        // Stay on welcome screen on error
      }
    };

    checkAuthAndNavigate();
  }, [navigation]);

  const handleGetStarted = async () => {
    console.log('Get Started pressed');
    try {
      // Mark first launch complete only when user explicitly starts
      await authFlowManager.markFirstLaunchComplete();
    } catch (e) {
      console.warn('WelcomeScreen: markFirstLaunchComplete failed (continuing):', e);
    }
    navigation.navigate('MobileScreen');
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image */}
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
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
