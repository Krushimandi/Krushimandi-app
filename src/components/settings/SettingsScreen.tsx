import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants';
import { getCompleteUserProfile } from '../../services/firebaseService';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  action?: () => void;
  value?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getCompleteUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const notifications = await AsyncStorage.getItem('notifications_enabled');
      const darkMode = await AsyncStorage.getItem('dark_mode_enabled');
      const location = await AsyncStorage.getItem('location_enabled');

      if (notifications !== null) setNotificationsEnabled(JSON.parse(notifications));
      if (darkMode !== null) setDarkModeEnabled(JSON.parse(darkMode));
      if (location !== null) setLocationEnabled(JSON.parse(location));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettingToStorage = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSettingToStorage('notifications_enabled', value);
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkModeEnabled(value);
    saveSettingToStorage('dark_mode_enabled', value);
  };

  const handleLocationToggle = (value: boolean) => {
    setLocationEnabled(value);
    saveSettingToStorage('location_enabled', value);
  };

  const handleLogout = () => {
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
              // Clear local data
              await AsyncStorage.multiRemove([
                'userData',
                'user_role',
                'auth_state',
                'notifications_enabled',
                'dark_mode_enabled',
                'location_enabled'
              ]);
              
              // Sign out from Firebase
              await auth().signOut();
              
              console.log('✅ User logged out successfully');              // Navigate to auth screen using our utility function
              import('../../utils/navigationUtils').then(
                ({ navigateToAuth }) => navigateToAuth()
              );
            } catch (error) {
              console.error('❌ Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please contact support to delete your account.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const settingsItems: SettingItem[] = [
    {
      id: 'profile',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      icon: 'person-outline',
      type: 'navigation',
      action: () => (navigation as any).navigate('Profile'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage your notification preferences',
      icon: 'notifications-outline',
      type: 'toggle',
      value: notificationsEnabled,
      onToggle: handleNotificationToggle,
    },
    {
      id: 'darkmode',
      title: 'Dark Mode',
      subtitle: 'Switch between light and dark theme',
      icon: 'moon-outline',
      type: 'toggle',
      value: darkModeEnabled,
      onToggle: handleDarkModeToggle,
    },
    {
      id: 'location',
      title: 'Location Services',
      subtitle: 'Allow app to access your location',
      icon: 'location-outline',
      type: 'toggle',
      value: locationEnabled,
      onToggle: handleLocationToggle,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      icon: 'shield-outline',
      type: 'navigation',
      action: () => console.log('Navigate to Privacy Policy'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Read our terms and conditions',
      icon: 'document-text-outline',
      type: 'navigation',
      action: () => console.log('Navigate to Terms'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle-outline',
      type: 'navigation',
      action: () => console.log('Navigate to Help'),
    },
    {
      id: 'logout',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: 'log-out-outline',
      type: 'action',
      action: handleLogout,
    },
    {
      id: 'delete',
      title: 'Delete Account',
      subtitle: 'Permanently delete your account',
      icon: 'trash-outline',
      type: 'action',
      action: handleDeleteAccount,
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingItem,
          (item.id === 'logout' || item.id === 'delete') && styles.dangerItem
        ]}
        onPress={item.type === 'toggle' ? undefined : item.action}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.settingLeft}>
          <View style={[
            styles.iconContainer,
            (item.id === 'logout' || item.id === 'delete') && styles.dangerIconContainer
          ]}>
            <Icon 
              name={item.icon} 
              size={20} 
              color={
                (item.id === 'logout' || item.id === 'delete') 
                  ? Colors.light.error 
                  : Colors.light.primary
              } 
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[
              styles.settingTitle,
              (item.id === 'logout' || item.id === 'delete') && styles.dangerText
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#767577', true: Colors.light.primary }}
            thumbColor={item.value ? '#ffffff' : '#f4f3f4'}
          />
        ) : (
          <Icon name="chevron-forward" size={16} color="#999" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info Section */}
      {userProfile && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {userProfile.profileImage ? (
                <Image 
                  source={{ uri: userProfile.profileImage }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={24} color={Colors.light.primary} />
                </View>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {userProfile.firstName} {userProfile.lastName}
              </Text>
              <Text style={styles.userRole}>
                {userProfile.userRole === 'farmer' ? '🌾 Farmer' : '🛒 Buyer'}
              </Text>
              <Text style={styles.userPhone}>{userProfile.phoneNumber}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsContainer}>
          {settingsItems.map(renderSettingItem)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  userSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: Colors.light.primary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  settingsContainer: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dangerItem: {
    borderColor: Colors.light.error + '20',
    backgroundColor: Colors.light.error + '05',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: Colors.light.error + '10',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  dangerText: {
    color: Colors.light.error,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});

export default SettingsScreen;
