import React, { useEffect, useState, useMemo } from 'react';
import { getFocusedRouteNameFromRoute, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef, isNavigationReady, pendingNotificationData, handleNotificationNavigation } from './navigationService';
import { notificationTabEmitter } from './buyer/notificationTabEmitter';
import { authFlowManager } from '../services/authFlowManager';
// Modular Firebase instances (replaces deprecated auth() / firestore())
import { auth, firestore, doc, onSnapshot, httpsCallable, functions } from '../config/firebaseModular';
import { useAuthStore } from '../store/authStore';
import auth1 from '@react-native-firebase/auth';

// Screen components
import LoadingScreen from '../components/common/LoadingScreen';
import { NotificationScreen, NotificationDetail } from '../components/notification';
import BuyerProfileScreen from '../components/ProfileScreen/BuyerProfileScreen';
import EditProfileScreen from '../components/ProfileScreen/EditProfileScreen';
import AboutScreen from '../components/ProfileScreen/AboutScreen';
import { HelpScreen, HelpGuide, FaqDetail, PaymentSecurity, AppPlatform, BestPractices } from '../components/Help';
import LanguagesScreen from '../components/ProfileScreen/LanguagesScreen';
import { TermsConditionScreen } from '../components/ProfileScreen';
import PrivacyOnlyScreen from '../components/ProfileScreen/PrivacyOnlyScreen';
import ChatListScreen from '../components/chat/ChatListScreen';
import ChatDetailScreen from '../components/chat/ChatDetailScreen';
// Navigation provider
import { NavigationProvider } from './NavigationProvider';

// Navigation stacks
import AuthNavigator from './auth/AuthStack';
import FarmerStack from './farmer/FarmerStack';
import BuyerStack from './buyer/BuyerStack';

// Types
import { RootStackParamList } from './types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileScreen from 'components/ProfileScreen/ProfileScreen';
import UnderMaintenanceScreen from '../components/common/UnderMaintenanceScreen';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import pushNotificationService from 'services/pushNotificationService';
import useOfflineCapability from 'hooks/useOfflineCapability';
import { setUserOnlineStatus } from 'services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserRole } from 'utils/userRoleStorage';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

const RootStack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  // bootstrapState is no longer required; kept optional for compatibility
  bootstrapState?: unknown;
}

// Root Navigator - Using AuthFlowManager
const AppNavigator: React.FC<AppNavigatorProps> = () => {
  const [initializing, setInitializing] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<'buyer' | 'farmer' | null>(null);
  const [navigationKey] = useState(0);
  const [mainStackKey, setMainStackKey] = useState(0); // force remount of role stack when role changes
  const insets = useSafeAreaInsets();
  const rc = useRemoteConfig();

  const { isOnline } = useOfflineCapability();

  // Primary auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user?.uid) {
        setUid(user.uid);
        try {
          const profile = await authFlowManager.loadUserProfile(user.uid);
          if (profile?.userRole && (profile.userRole === 'buyer' || profile.userRole === 'farmer')) {
            setRole((prev) => {
              if (prev !== profile.userRole) {
                // bump key to force stack remount
                setMainStackKey(Date.now());
              }
              return profile.userRole;
            });
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setRole(null);
        }
      } else {
        setUid(null);
        setRole(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Subscribe to auth store userType changes (immediate UI switch after role change action)
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prevState) => {
      const newUserType = state.user?.userType;
      const prevUserType = prevState?.user?.userType;
      if (
        newUserType &&
        newUserType !== prevUserType &&
        (newUserType === 'buyer' || newUserType === 'farmer')
      ) {
        setRole((prevRole) => {
          if (prevRole !== newUserType) setMainStackKey(Date.now());
          return newUserType as 'buyer' | 'farmer';
        });
      }
    });
    return () => {
      try { unsub(); } catch { }
    };
  }, []);

  const handleLogout = async () => {
    try {
      const currentUser = auth1().currentUser;
      const uid = currentUser?.uid;
      // Get current FCM token before clearing
      const fcmToken = pushNotificationService.getFCMTokenSync();
      // Set user offline before logout
      if (uid) {
        try {
          if (isOnline) {
            await setUserOnlineStatus(uid, false);
          } else {
            // Skip setting offline status manually
            // Server automatically sets user to offline after 10 minutes of inactivity
          }
          console.log('✅ User status set to offline');
        } catch (error) {
          console.error('⚠️ Failed to set offline status:', error);
        }
      }

      // Remove FCM token from backend
      if (uid && fcmToken) {
        try {
          console.log('🗑️ Removing FCM token from backend...');
          const removeFcmToken = httpsCallable(functions, 'removeFcmToken');
          await removeFcmToken({ uid, token: fcmToken });
          console.log('✅ FCM token removed successfully');
        } catch (error) {
          console.error('⚠️ Failed to remove FCM token:', error);
          // Continue with logout even if token removal fails
        }
      }

      // Clear local storage
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
      await auth1().signOut();

      // User logged out successfully
      import('../utils/navigationUtils').then(
        ({ navigateToAuth }) => navigateToAuth()
      );
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }

  };

  // Live Firestore listener for profile updates (role + status)
  useEffect(() => {
    if (!uid) return;

    const docRef = firestore.collection('profiles').doc(uid);
    const unsubscribe = docRef.onSnapshot(
      async (snap) => {
        if (!snap.exists) return;
        const data: any = snap.data();
        const nextRole = data?.userRole;
        const status = data?.status || 'active';

        // 🧩 If user is inactive, force logout and redirect
        if (status === 'inactive') {
          Alert.alert(
            "Account Inactive",
            "Your account has been deactivated by the admin.",
            [
              {
                text: "Login Again",
                onPress: async () => {
                  handleLogout();
                },
              },
            ],
            { cancelable: false }
          );
          return;
        }

        // 🧩 If active, sync the user role (buyer/farmer)
        if (nextRole === 'buyer' || nextRole === 'farmer') {
          setRole((prev) => {
            if (prev !== nextRole) {
              setMainStackKey(Date.now());
            }
            return nextRole;
          });
        }
      },
      (err) => console.error('Firestore profile listener error:', err)
    );

    return unsubscribe;
  }, [uid]);

  const isAuthenticated = !!uid;
  const hasRole = role === 'buyer' || role === 'farmer';
  const initialRouteName = isAuthenticated && hasRole ? 'Main' : 'Auth';

  const MainStackComponent = useMemo(() => {
    if (!isAuthenticated || !hasRole) return AuthNavigator;
    return role === 'buyer' ? BuyerStack : FarmerStack;
  }, [isAuthenticated, hasRole, role]);

  if (initializing) return <LoadingScreen />;
  if (rc.maintenanceMode) {
    return (
      <NavigationProvider>
        <NavigationContainer ref={navigationRef}>
          <UnderMaintenanceScreen />
        </NavigationContainer>
      </NavigationProvider>
    );
  }
  return (
    <NavigationProvider>
      <NavigationContainer
        key={navigationKey}
        ref={navigationRef}
        onReady={() => {
          isNavigationReady.current = true;
          if (pendingNotificationData.current && isAuthenticated && hasRole) {
            handleNotificationNavigation(pendingNotificationData.current, notificationTabEmitter);
            pendingNotificationData.current = null;
          }
        }}
      >
        <RootStack.Navigator
          screenOptions={({ route }) => {
            // Default fullscreen nahi
            let isFullScreen = false;

            // Ye direct RootStack screens ke liye
            const fullScreenList = ['Welcome', 'Auth'];

            if (fullScreenList.includes(route.name)) {
              isFullScreen = true;
            }

            // for Nested Stack
            if (route.name === 'Main') {
              const nestedRoute = getFocusedRouteNameFromRoute(route) ?? '';
              const nestedFullScreens = ['FruitsScreen'];
              if (nestedFullScreens.includes(nestedRoute)) {
                isFullScreen = true;
              }
            }

            return {
              headerShown: false,
              cardStyle: { paddingBottom: isFullScreen ? 0 : insets.bottom * 0.6, backgroundColor: '#FFFFFF' },
            };
          }}
          initialRouteName={initialRouteName}
        >
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Main">
            {() => <MainStackComponent key={mainStackKey} />}
          </RootStack.Screen>
          <RootStack.Screen name="Notification" component={NotificationScreen} />
          <RootStack.Screen name="NotificationDetail" component={NotificationDetail as React.ComponentType<any>} />
          <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
          <RootStack.Screen name="About" component={AboutScreen} />
          <RootStack.Screen name="HelpScreen" component={HelpScreen} />
          <RootStack.Screen name="FaqDetail" component={FaqDetail} />
          <RootStack.Screen name="HelpGuide" component={HelpGuide} />
          <RootStack.Screen name="PaymentSecurity" component={PaymentSecurity} />
          <RootStack.Screen name="AppPlatform" component={AppPlatform} />
          <RootStack.Screen name="BestPractices" component={BestPractices} />
          <RootStack.Screen name="Languages" component={LanguagesScreen} />
          <RootStack.Screen name="TermsCondition" component={TermsConditionScreen} />
          <RootStack.Screen name="PrivacyOnly" component={PrivacyOnlyScreen} />
          <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
          <RootStack.Screen name="BuyerProfile" component={BuyerProfileScreen} />
          <RootStack.Screen name="ChatList" component={ChatListScreen} />
          <RootStack.Screen name="ChatDetail" component={ChatDetailScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </NavigationProvider >
  );
};

export default AppNavigator;