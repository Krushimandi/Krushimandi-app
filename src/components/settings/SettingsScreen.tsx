import React, { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import FeedbackModal, { FeedbackData } from '@ui/FeedbackModal';
import { requestService } from '../../services/requestService';

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
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Octicons from 'react-native-vector-icons/Octicons';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Colors, StorageKeys } from '../../constants';
import { getCompleteUserProfile, updateUserProfile } from '../../services/firebaseService';
import { clearUserRole } from '../../utils/userRoleStorage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  action?: () => void;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  color?: string;
  badge?: string;
}

const SettingsScreen: React.FC = () => {

  type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Modal state for profile image
  const [modalVisible, setModalVisible] = useState(false);


  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);

  // Always fetch fresh profile on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const openFeedbackModal = (): void => setIsModalVisible(true);
  const closeFeedbackModal = (): void => setIsModalVisible(false);

  const handleFeedbackSubmit = (feedbackData: FeedbackData): void => {
    // Send feedback to backend
    if (!userProfile) {
      Alert.alert('Error', 'User profile not loaded.');
      return;
    }
    const uuid = userProfile.id || userProfile.uid || userProfile.userId || userProfile.phoneNumber || 'unknown';
    const userType = userProfile.userRole === 'farmer' ? 'farmer' : 'buyer';
    requestService.sendFeedback(uuid, {
      message: feedbackData.feedback,
      rating: feedbackData.rating,
      userType,
      context: 'settings_feedback',
    })
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Feedback Sent',
          text2: 'Thank you for your feedback!',
          position: 'bottom',
          visibilityTime: 1000,
        });
        closeFeedbackModal();
      })
      .catch((error: any) => {
        console.log('Failed to send feedback: ' + error.message);
        Toast.show({
          type: 'error',
          text1: 'Feedback Error',
          // text2: 'Failed to send feedback: ' + error.message,
          position: 'bottom',
          visibilityTime: 1000,
        });
      });
  };

  const loadUserProfile = async () => {
    try {
      let profile = await getCompleteUserProfile(false);
      if (!profile) {
        // If not found, force refresh from Firestore
        profile = await updateUserProfile();
      }
      console.log("Profile", profile);
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
      const biometric = await AsyncStorage.getItem('biometric_enabled');

      if (notifications !== null) setNotificationsEnabled(JSON.parse(notifications));
      if (darkMode !== null) setDarkModeEnabled(JSON.parse(darkMode));
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
              await AsyncStorage.multiRemove([
                'userData',
                'user_role',
                'auth_state',
                'notifications_enabled',
                'dark_mode_enabled',
                'location_enabled',
                'biometric_enabled',
                'authStep'
              ]);

              await clearUserRole();
              await auth().signOut();

              console.log('✅ User logged out successfully');
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

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          icon: 'create-outline',
          type: 'navigation' as const,
          action: () => (navigation as any).navigate('EditProfile'),
          color: '#3B82F6',
        },
        {
          id: 'changeRole',
          title: 'Switch Role',
          subtitle: 'Switch role to buyer/farmer',
          icon: 'arrow-switch',
          type: 'navigation' as const,
          action: () => Toast.show({
            type: 'info',
            position: 'bottom',
            visibilityTime: 1000,
            text1: 'This feature is coming soon!',
          }),
          color: '#3B82F6',
          badge: 'New',
        },
        // {
        //   id: 'verification',
        //   title: 'Account Verification',
        //   subtitle: 'Verify your farmer/buyer status',
        //   icon: 'shield-checkmark-outline',
        //   type: 'navigation' as const,
        //   action: () => console.log('Navigate to Verification'),
        //   color: '#22C55E',
        //   badge: 'NEW',
        // },
        // {
        //   id: 'payment',
        //   title: 'Payment Methods',
        //   subtitle: 'Manage your payment options',
        //   icon: 'card-outline',
        //   type: 'navigation' as const,
        //   action: () => console.log('Navigate to Payment'),
        //   color: '#059669',
        // },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Get notified about new deals and updates',
          icon: 'notifications-outline',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: handleNotificationToggle,
          color: '#43B86C',
        },
        {
          id: 'darkmode',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark theme',
          icon: 'moon-outline',
          type: 'toggle' as const,
          value: darkModeEnabled,
          onToggle: handleDarkModeToggle,
          color: '#43B86C',
        },
        // {
        //   id: 'location',
        //   title: 'Location Services',
        //   subtitle: 'Find nearby farmers and buyers',
        //   icon: 'location-outline',
        //   type: 'toggle' as const,
        //   value: locationEnabled,
        //   onToggle: handleLocationToggle,
        //   color: '#43B86C',
        // },
      ],
    },
    {
      title: 'Support & Info',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          subtitle: 'Get help and contact support',
          icon: 'help-circle-outline',
          type: 'navigation' as const,
          action: () => navigation.navigate('HelpScreen'),
          color: '#6B7280',
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Help us improve the app',
          icon: 'chatbubble-outline',
          type: 'navigation' as const,
          action: () => { openFeedbackModal() },
          color: '#6B7280',
        },
        {
          id: 'terms',
          title: 'Privacy Policy',
          subtitle: 'Read our terms and conditions and privacy policy',
          icon: 'document-text-outline',
          type: 'navigation' as const,
          action: () => navigation.navigate('PrivacyPolicy'),
          color: '#6B7280',
        },
        {
          id: 'about',
          title: 'About App',
          subtitle: 'Version 1.0.0',
          icon: 'information-circle-outline',
          type: 'navigation' as const,
          action: () => navigation.navigate('About'),
          color: '#6B7280',
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          subtitle: 'Sign out of your account',
          icon: 'log-out-outline',
          type: 'action' as const,
          action: handleLogout,
          color: '#EF4444',
        },
        // {
        //   id: 'delete',
        //   title: 'Delete Account',
        //   subtitle: 'Permanently delete your account',
        //   icon: 'trash-outline',
        //   type: 'action' as const,
        //   action: handleDeleteAccount,
        //   color: '#DC2626',
        // },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number) => {
    const isDestructive = item.id === 'logout' || item.id === 'delete';

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingItem,
          isDestructive && styles.destructiveItem,
        ]}
        onPress={item.type === 'toggle' ? undefined : item.action}
        disabled={item.type === 'toggle'}
        activeOpacity={0.7}
      >
        <View style={styles.settingLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: item.color + '15' }
          ]}>
            {item.icon == 'arrow-switch' ?
              <Octicons
                name={item.icon}
                size={22}
                color={item.color}
              /> : <Icon
                name={item.icon}
                size={22}
                color={item.color}
              />}
          </View>

          <View style={styles.settingInfo}>
            <View style={styles.titleRow}>
              <Text style={[
                styles.settingTitle,
                isDestructive && styles.destructiveText
              ]}>
                {item.title}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#E5E7EB', true: item.color + '40' }}
            thumbColor={item.value ? item.color : '#FFFFFF'}
            style={styles.switch}
          />
        ) : (
          <View style={styles.chevronContainer}>
            <Icon name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content"
        backgroundColor="#43B86C"
        translucent={false} />

      {/* Updated Header with Emerald Theme */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBackground}>
          <View style={styles.headerPattern} />
          <View style={styles.headerOverlay} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your profile</Text>
          </View>

          {/* <TouchableOpacity
            style={styles.headerButton}
            onPress={() => (navigation as any).navigate('EditProfile')}>
            <Icon name="create-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity> */}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Card */}
        <View style={styles.userCard}>
          {!userProfile ? (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Icon name="person-circle-outline" size={64} color="#BDBDBD" />
              <Text style={{ color: '#888', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
                User profile not found
              </Text>
            </View>
          ) : (
            <View style={styles.userHeader}>
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.avatarContainer}
                  activeOpacity={0.8}
                  onPress={() => userProfile.profileImage && setModalVisible(true)}
                >
                  {userProfile.profileImage ? (
                    <Image
                      source={{ uri: userProfile.profileImage }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Icon name="person" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.statusIndicator} />
                </TouchableOpacity>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {userProfile.firstName} {userProfile.lastName}
                  </Text>
                  <View style={styles.roleContainer}>
                    <Text style={styles.roleEmoji}>
                      {userProfile.userRole === 'farmer' ? '🌾' : '🛒'}
                    </Text>
                    <Text style={styles.userRole}>
                      {userProfile.userRole === 'farmer' ? 'Farmer' : 'Buyer'}
                    </Text>
                  </View>
                  <Text style={styles.userPhone}>{userProfile.phoneNumber}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Profile Image Modal */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <BlurView
              style={styles.modalBlur}
              blurType="light"
              blurAmount={15}
              reducedTransparencyFallbackColor="white"
            >
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
              {userProfile?.profileImage && (
                <GestureHandlerRootView style={styles.modalImageContainer}>
                  <CustomZoomableImage
                    uri={userProfile.profileImage}
                    onClose={() => setModalVisible(false)}
                  />
                </GestureHandlerRootView>
              )}
            </BlurView>
          </Modal>
        </View>

        {/* Settings Groups */}
        <View style={styles.settingsContainer}>
          {settingsGroups.map((group, groupIndex) => (
            <View key={group.title} style={styles.settingsGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupItems}>
                {group.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
              </View>
            </View>
          ))}
        </View>

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

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Krushimandi</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 Krushimandi. All rights reserved.</Text>
        </View>
        <FeedbackModal
          isVisible={isModalVisible}
          onClose={closeFeedbackModal}
          onSubmit={handleFeedbackSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

// Custom zoomable image component using gesture handler and reanimated v2+ (plain JS)
const CustomZoomableImage = ({ uri, onClose }: { uri: any; onClose: any }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value < 1 ? 1 : scale.value;
      scale.value = withSpring(savedScale.value < 1 ? 1 : savedScale.value);
    })
    .onStart(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  React.useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri]);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={{ flex: 1, width: '100%', height: '100%' }}>
        <Animated.Image
          source={{ uri }}
          style={[{ width: '100%', height: '100%', resizeMode: 'contain' }, animatedStyle]}
        />
        <TouchableOpacity
          style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 10 }}
          onPress={onClose}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

export default SettingsScreen;
const styles = StyleSheet.create({
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 1,
  },
  modalImageContainer: {
    width: '95%',
    height: '95%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    position: 'relative',
    paddingTop: StatusBar.currentHeight || 44,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#43B86C',
    // backgroundColor: '#28A745',
    opacity: 0.95,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 6,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#43B86C',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#43B86C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  roleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  userRole: {
    fontSize: 14,
    color: '#43B86C',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#43B86C',
  },
  settingsContainer: {
    paddingHorizontal: 20,
  },
  settingsGroup: {
    marginBottom: 32,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#43B86C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.05)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  destructiveItem: {
    backgroundColor: '#FEF2F2',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  destructiveText: {
    color: '#DC2626',
  },
  badge: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#43B86C',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});