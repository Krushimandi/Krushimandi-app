/**
 * Auth Flow Manager
 * Manages consistent authentication flow and state persistence
 */

import { auth, firestore } from '../config/firebaseModular';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  userRole: 'farmer' | 'buyer';
  profileImage?: string;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  businessType?: string;
  PreferedFruits?: string[];
  location?: any;
  status: string;
  createdAt: any;
  updatedAt: any;
  lastLoginAt?: any;
}

export interface AuthFlowState {
  step: 'welcome' | 'phone' | 'otp' | 'role_selection' | 'profile_setup' | 'fruit_selection' | 'complete';
  hasProfile: boolean;
  userRole: 'farmer' | 'buyer' | null;
  isProfileComplete: boolean;
  needsFruitSelection: boolean;
}

export interface NavigationRoute {
  screen: string;
  params?: any;
}

class AuthFlowManager {
  private static instance: AuthFlowManager;
  private readonly FLOW_STATE_KEY = '@krushimandi:auth_flow_state';

  static getInstance(): AuthFlowManager {
    if (!AuthFlowManager.instance) {
      AuthFlowManager.instance = new AuthFlowManager();
    }
    return AuthFlowManager.instance;
  }

  /**
   * Load user profile from Firestore and update Zustand store
   */
  async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {


      const docRef = firestore.collection('profiles').doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {

        return null;
      }

      const data = doc.data();
      
      // Handle edge case where doc exists but data is undefined
      if (!data) {
        console.warn('⚠️ Document exists but data is undefined for uid:', uid);
        return null;
      }
      
      const profile: UserProfile = {
        uid,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        phoneNumber: data.phoneNumber || '',
        userRole: data.userRole,
        profileImage: data.profileImage,
        isPhoneVerified: data.isPhoneVerified || true,
        isProfileComplete: data.isProfileComplete || false,
        businessType: data.businessType,
        PreferedFruits: data.PreferedFruits || [],
        location: data.location,
        status: data.status || 'active',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastLoginAt: data.lastLoginAt,
      };

      // Update Zustand store ONLY if userRole exists (otherwise we'll re-route to role selection)
      if (profile.userRole) {
        const authStore = useAuthStore.getState();
        authStore.setUser({
          id: uid,
          phone: profile.phoneNumber,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.profileImage,
          userType: profile.userRole,
          status: profile.status as any,
          createdAt: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: profile.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      } else {

      }

      // Persist to AsyncStorage for offline access
      await this.persistUserData(profile);


      return profile;
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * Persist user data to AsyncStorage
   */
  private async persistUserData(profile: UserProfile): Promise<void> {
    try {
      const userData = {
        uid: profile.uid,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        userRole: profile.userRole,
        profileImage: profile.profileImage,
        isProfileComplete: profile.isProfileComplete,
        businessType: profile.businessType,
        PreferedFruits: profile.PreferedFruits,
        location: profile.location,
        status: profile.status,
        lastSyncAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userData', JSON.stringify(userData));

    } catch (error) {
      console.error('❌ Failed to persist user data:', error);
    }
  }

  /**
   * Get current auth flow state
   */
  async getAuthFlowState(): Promise<AuthFlowState> {
    try {
      const user = auth.currentUser;

      // If no Firebase user, start from welcome screen
      // User can use Truecaller or proceed to phone verification from there
      if (!user) {
        return {
          step: 'welcome',
          hasProfile: false,
          userRole: null,
          isProfileComplete: false,
          needsFruitSelection: false,
        };
      }

      // Try to load user profile
      const profile = await this.loadUserProfile(user.uid);

      if (!profile) {
        return {
          step: 'role_selection',
          hasProfile: false,
          userRole: null,
          isProfileComplete: false,
          needsFruitSelection: false,
        };
      }

      if (!profile.userRole) {

        return {
          step: 'role_selection',
          hasProfile: true,
          userRole: null,
          isProfileComplete: false,
          needsFruitSelection: false,
        };
      }

      // Profile exists, determine next step
      if (!profile.isProfileComplete || !profile.firstName || !profile.lastName) {
        return {
          step: 'profile_setup',
          hasProfile: true,
          userRole: profile.userRole,
          isProfileComplete: false,
          needsFruitSelection: false,
        };
      }

      // For buyers, check if fruit selection is needed
      if (profile.userRole === 'buyer') {
        const needsFruits = !profile.PreferedFruits || profile.PreferedFruits.length === 0;
        if (needsFruits) {
          return {
            step: 'fruit_selection',
            hasProfile: true,
            userRole: profile.userRole,
            isProfileComplete: true,
            needsFruitSelection: true,
          };
        }
      }

      // All steps complete
      return {
        step: 'complete',
        hasProfile: true,
        userRole: profile.userRole,
        isProfileComplete: true,
        needsFruitSelection: false,
      };
    } catch (error) {
      console.error('❌ Error getting auth flow state:', error);
      return {
        step: 'welcome',
        hasProfile: false,
        userRole: null,
        isProfileComplete: false,
        needsFruitSelection: false,
      };
    }
  }

  /**
   * Get navigation route based on auth flow state
   */
  async getNavigationRoute(): Promise<NavigationRoute> {
    const state = await this.getAuthFlowState();
    switch (state.step) {
      case 'welcome':
        return { screen: 'Welcome' };
      case 'phone':
        return { screen: 'MobileScreen' };
      case 'otp':
        return { screen: 'OTPVerification' };

      case 'role_selection':
        return { screen: 'RoleSelection' };

      case 'profile_setup':
        return {
          screen: 'IntroduceYourself',
          params: { userRole: state.userRole }
        };

      case 'fruit_selection':
        return { screen: 'FruitsScreen' };

      case 'complete':
        // Navigate to appropriate home based on user role
        if (state.userRole === 'buyer') {
          return { screen: 'Main' }; // Buyer home
        } else {
          return { screen: 'Main' }; // Farmer home
        }

      default:
        return { screen: 'Welcome' };
    }
  }

  /**
   * Update auth flow state after completing a step
   */
  async updateFlowState(step: AuthFlowState['step']): Promise<void> {
    try {
      const currentState = await this.getAuthFlowState();
      const newState = { ...currentState, step };

      await AsyncStorage.setItem(this.FLOW_STATE_KEY, JSON.stringify(newState));

    } catch (error) {
      console.error('❌ Failed to update flow state:', error);
    }
  }

  /**
   * Clear all auth flow data (for logout)
   */
  async clearAuthFlow(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.FLOW_STATE_KEY,
        'userData',
        'user_role',
        'authStep',
      ]);

      // Clear Zustand store
      const authStore = useAuthStore.getState();
      authStore.setUser(null);

    } catch (error) {
      console.error('❌ Failed to clear auth flow:', error);
    }
  }

  /**
   * Handle OTP verification and load profile
   */
  async handleOTPVerification(confirmation: any, otp: string): Promise<NavigationRoute> {
    try {


      // Confirm OTP
      const userCredential = await confirmation.confirm(otp);
      const user = userCredential.user;

      if (!user) {
        throw new Error('No user returned from OTP verification');
      }

      // Try to load existing profile
      const profile = await this.loadUserProfile(user.uid);


      if (!profile || !profile.userRole) {
        await this.updateFlowState('role_selection');
        return { screen: 'RoleSelection' };
      }

      const needsProfileSetup = (!profile.isProfileComplete || !profile.firstName || !profile.lastName);
      if (needsProfileSetup) {
        await this.updateFlowState('profile_setup');
        return {
          screen: 'IntroduceYourself',
          params: { userRole: profile.userRole }
        };
      }

      // For buyers, check fruit selection
      if (profile.userRole === 'buyer') {
        const needsFruits = !profile.PreferedFruits || profile.PreferedFruits.length === 0;
        if (needsFruits) {
          await this.updateFlowState('fruit_selection');
          return { screen: 'FruitsScreen' };
        }
      }

      // Complete - go to home
      await this.updateFlowState('complete');
      return { screen: 'Main' };

    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Resume auth flow from current state
   */
  async resumeAuthFlow(): Promise<NavigationRoute> {
    return await this.getNavigationRoute();
  }
}

export const authFlowManager = AuthFlowManager.getInstance();
