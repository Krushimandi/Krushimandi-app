import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

interface NavigationProp {
  goBack: () => void;
}

interface AboutPageProps {
  navigation?: NavigationProp;
}

interface MenuItem {
  title: string;
  onPress: () => void;
}

interface MenuItemProps {
  title: string;
  onPress: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ navigation }) => {

  const AppLogo: React.FC = () => (
    <View style={styles.logoContainer}>
      <Image
        source={require('../../assets/images/logo1.png')}
        style={styles.logo} />
    </View>
  );

  const MenuItem: React.FC<MenuItemProps> = ({ title, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuItemText}>{title}</Text>
      <Icon name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const handleBackPress = (): void => {
    if (navigation) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
           <Icon name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* App Logo and Info */}
        <View style={styles.appInfoSection}>
          <AppLogo />
          {/* <Text style={styles.appName}>Krushimandi Innovations</Text> */}
          <Text style={styles.versionText}>Version : 1.0.0</Text>
          <Text style={styles.buildText}>Build : 5.18.77.2045178916/2025 (general)</Text>
          <Text style={styles.callingVersionText}>calling version : 2025.1.10.1</Text>
          <Text style={styles.companyText}>Krushimandi Innovations PVT. LTD.</Text>
          <Text style={styles.copyrightText}>Copyright @ 2025</Text>
        </View>

      </View>

      {/* Bottom indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: (StatusBar.currentHeight ?? 0) + 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    height: 100,
    resizeMode: 'contain',
    alignContent: 'center',
    overflow: 'hidden',
  },
  logoSquare: {
    width: '33.33%',
    height: '33.33%',
    margin: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  callingVersionText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 20,
  },
  companyText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
  },
  bottomIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 8,
  },
});

export default AboutPage;