import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import RNBootSplash from 'react-native-bootsplash';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* App Name */}
        <Text style={styles.appName}>Krushimandi</Text>
      </View>
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.companyText}>KrushiMandi PVT. LTD.</Text>
        <ActivityIndicator 
          size="small" 
          color="#4CAF50" 
          style={styles.loader} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: 0.5,
    marginTop: 20,
  },
  bottomSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  companyText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  loader: {
    marginTop: 10,
  },
});

export default SplashScreen;
