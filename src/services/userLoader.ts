import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { saveUserToAsyncStorage, saveOfflineAuthState } from './firebaseService';
import { User } from '../types';

const toIso = (ts: any): string => {
  try {
    if (!ts) return new Date().toISOString();
    // RN Firebase Timestamp has toDate()
    if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
    if (typeof ts === 'number') return new Date(ts).toISOString();
    if (typeof ts === 'string') return ts;
  } catch { }
  return new Date().toISOString();
};

const normalizeRole = (raw: any): 'farmer' | 'buyer' | 'admin' | undefined => {
  if (!raw) return undefined;
  const r = String(raw).trim().toLowerCase();
  if (r === 'farmer' || r === 'buyer' || r === 'admin') return r as any;
  return undefined;
};

const mapProfileToUser = (uid: string, profile: any, fallbackPhone?: string): User => {
  const userRole = normalizeRole(profile?.userRole ?? profile?.role ?? profile?.userType) || 'buyer';
  const createdAt = toIso(profile?.createdAt);
  const updatedAt = toIso(profile?.updatedAt);
  return {
    id: uid,
    phone: profile?.phoneNumber || fallbackPhone || '',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    avatar: profile?.profileImage || undefined,
    userType: userRole as any,
    status: (profile?.status as any) || 'active',
    dateOfBirth: profile?.dateOfBirth || undefined,
    address: profile?.address || undefined,
    createdAt,
    updatedAt,
  };
};

export const loadUserProfileToStore = async (): Promise<{ profile: any; user: User } | null> => {
  const fbUser = auth().currentUser;
  if (!fbUser?.uid) return null;
  const uid = fbUser.uid;
  try {
    const snap = await firestore().collection('profiles').doc(uid).get();
    if (!snap.exists) return null;
    const raw: any = snap.data() as any;
    const profile: any = { uid, ...(raw || {}) };
    const user = mapProfileToUser(uid, profile, fbUser.phoneNumber || undefined);
    const store = useAuthStore.getState();
    // 1) Hydrate Zustand store
    store.setUser(user);

    // 2) Persist to AsyncStorage so global auth flow (isRoleSelected/isProfileCompleted) can read it
    try {
      const displayName = (profile?.displayName as string) || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const isProfileComplete = Boolean(
        profile?.isProfileComplete === true ||
        ((user.firstName?.trim()?.length || 0) > 0 && (user.lastName?.trim()?.length || 0) > 0) ||
        (displayName && displayName.trim().length > 0)
      );

      const storagePayload: any = {
        uid,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName,
        phoneNumber: user.phone,
        userRole: user.userType,
        profileImage: user.avatar || null,
        isProfileComplete,
        createdAt: profile?.createdAt || new Date().toISOString(),
        updatedAt: profile?.updatedAt || new Date().toISOString(),
        // Buyer extras if present
        ...(user.userType === 'buyer' && {
          PreferedFruits: (profile?.PreferedFruits as any) || (profile?.preferredCrops as any) || [],
          businessType: (profile?.businessType as any) || null,
        }),
      };

      await saveUserToAsyncStorage(storagePayload);

      // Keep offline auth state in sync for resilience
      await saveOfflineAuthState(storagePayload);

      // Optionally nudge auth step to reflect role/profile completion
      try {
        const nextStep = isProfileComplete ? 'Complete' : 'RoleSelected';
        await AsyncStorage.setItem('authStep', nextStep);
      } catch { }
    } catch (persistErr) {
      console.warn('Failed to persist user to AsyncStorage/offline state:', persistErr);
    }
    return { profile, user };
  } catch (e) {
    console.warn('Failed to load user profile to store:', e);
    return null;
  }
};

export type { User };
