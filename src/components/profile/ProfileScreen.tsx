import React, { useState, useEffect } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { Linking, Alert, ActivityIndicator } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuthBootstrap } from '../../hooks/useAuthBootstrap';
import { getCompleteUserProfile, clearUserData } from '../../services/firebaseService';
import { Colors } from '../../constants/Colors';
import { clearAuthData } from '../../utils/authFlow';

interface MenuItem {
  icon: string;
  text: string;
  iconType: 'FontAwesome' | 'FontAwesome5';
  route?: string;
}

interface UserProfile {
  uid: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  userRole?: 'farmer' | 'buyer';
  profileImage?: string;
  lastLoginAt?: {
    seconds: number;
  };
  phoneNumber?: string;
  email?: string;
}

const ProfileScreen = () => {
  const { user } = useAuthBootstrap(); // Remove logout from here
  const navigation = useNavigation<NavigationProp<any>>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await getCompleteUserProfile() as UserProfile;
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);

              console.log('🚪 Starting logout process...');

              // Clear auth data and user data (includes Firebase signOut)
              await clearAuthData();
              await clearUserData();

              console.log('✅ Logout completed successfully');

              // The auth state will update automatically and navigate to auth screen
            } catch (error) {
              console.error('❌ Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const getDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    if (userProfile?.displayName) {
      return userProfile.displayName;
    }
    return 'Krushi User';
  };

  const getLastLoginText = () => {
    if (userProfile?.lastLoginAt) {
      const date = new Date(userProfile.lastLoginAt.seconds * 1000);
      return `Last Login: ${date.toLocaleDateString()}`;
    }
    return `Role: ${userProfile?.userRole === 'farmer' ? 'Farmer' : 'Buyer'}`;
  };

  const getProfileImage = () => {
    if (userProfile?.profileImage) {
      return { uri: userProfile.profileImage };
    }
    return require('../../assets/images/logo.png');
  };

  const handleMenuItemPress = (item: MenuItem) => {
    console.log('🔍 Menu item pressed:', item.text, 'Route:', item.route);
    
    if (item.route) {
      try {
        navigation.navigate(item.route as never);
        console.log('✅ Navigation successful to:', item.route);
      } catch (error) {
        console.error('❌ Navigation error:', error);
        Alert.alert('Navigation Error', `Failed to navigate to ${item.text}: ${error}`);
      }
    } else {
      // Handle other menu items that don't have routes yet
      Alert.alert('Coming Soon', `${item.text} feature is coming soon!`);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.screenTitle}>Profile</Text>


      <View style={styles.profileBox}>
        <Image
          source={getProfileImage()}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{getDisplayName()}</Text>
          <Text style={styles.lastLogin}>{getLastLoginText()}</Text>
          {userProfile?.phoneNumber && (
            <Text style={styles.phoneNumber}>+91 {userProfile.phoneNumber.slice(3, 13)}</Text>
          )}
        </View>
      </View>

      <View style={styles.settingsSection}>

        <View style={styles.topBoxContainer}>
          <TouchableOpacity style={styles.topBox}>
            <MaterialCommunityIcons name="account-switch-outline" size={24} color={Colors.light.primary} />
            <Text style={styles.topBoxText}>
              {userProfile?.userRole === 'farmer' ? 'Switch to Buyer' : 'Switch to Farmer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBox}>
            <Ionicons name="receipt-outline" size={24} color={Colors.light.primary} />
            <Text style={styles.topBoxText}>
              {userProfile?.userRole === 'farmer' ? 'My Orders' : 'Purchase History'}
            </Text>
          </TouchableOpacity>
        </View>


        {([
          { icon: 'user-edit', text: 'Edit Profile', iconType: 'FontAwesome5', route: 'EditProfile' },
          { icon: 'cog', text: 'Settings', iconType: 'FontAwesome', route: 'ProfileSettings' },
          { icon: 'question-circle', text: 'Help & Support', iconType: 'FontAwesome', route: 'HelpGuide' },
          { icon: 'star', text: 'Rate KrushiMandi', iconType: 'FontAwesome' },
          { icon: 'file-text-o', text: 'Terms & Conditions', iconType: 'FontAwesome' },
          { icon: 'shield', text: 'Privacy Policy', iconType: 'FontAwesome', route: 'PrivacyPolicy' },
          { icon: 'info-circle', text: 'About KrushiMandi', iconType: 'FontAwesome', route: 'AboutKrushimandi' },
          { icon: 'phone', text: 'Contact Us', iconType: 'FontAwesome' },
        ] as MenuItem[]).map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.optionRow}
            onPress={() => handleMenuItemPress(item)}
          >
            <View style={styles.iconWrapper}>
              {item.iconType === 'FontAwesome5' ? (
                <FontAwesome5 name={item.icon} size={20} color={Colors.light.primary} />
              ) : (
                <FontAwesome name={item.icon} size={20} color={Colors.light.primary} />
              )}
            </View>
            <Text style={styles.optionText}>{item.text}</Text>
            <Ionicons name="chevron-forward" size={20} color="#777" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}


        <View style={styles.footer}>
          <View style={styles.socialIcons}>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL('https://x.com/krushimandi?t=MpwAOndTGNhpmH69CuITtA&s=09')}
            >
              <FontAwesome5 name="twitter" size={22} color="#1DA1F2" />
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL('https://www.facebook.com/share/1C2G6fiHPW/')}
            >
              <FontAwesome5 name="facebook-f" size={22} color="#1877F2" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL('https://www.instagram.com/krushimandi?igsh=ZXpuZmZ1dGJkOXU5')}
            >
              <FontAwesome5 name="instagram" size={22} color="#C13584" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL('https://youtube.com/@krushimandi?si=XREGlmY9a7ZVBl6E')}
            >
              <FontAwesome5 name="youtube" size={22} color="#FF0000" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#D11A2A" />
            ) : (
              <MaterialCommunityIcons name="power" size={22} color="#D11A2A" />
            )}
            <Text style={styles.logoutText}>
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            KrushiMandi v1.0.0  •  Made with <Text style={{ color: Colors.light.primary }}>❤️</Text> in India
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  profileBox: {
    backgroundColor: Colors.light.primary + 'E6',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    // elevation: 3,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: Colors.light.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastLogin: {
    color: "#555",
    fontSize: 14,
    fontWeight: '600',
  },
  phoneNumber: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
    opacity: 0.9,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    marginTop: 40,
    marginBottom: 10,
    marginLeft: 30,
    color: Colors.light.text,
  },
  settingsSection: {
    marginTop: 16,
  },
  topBoxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  topBox: {
    width: '45%',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topBoxText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    elevation: 1,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  iconWrapper: {
    backgroundColor: Colors.light.backgroundSecondary,
    width: 42,
    height: 42,
    borderRadius: 20,
    marginRight: 16,
    justifyContent: 'center', // centers vertically
    alignItems: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 30,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  socialIcon: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    minWidth: 48,
    padding: 12,
    marginHorizontal: 8,
    elevation: 1,
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#D11A2A',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
    backgroundColor: Colors.light.background,
    elevation: 1,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#D11A2A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginHorizontal: 20,
  },
});
