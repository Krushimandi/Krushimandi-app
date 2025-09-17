import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, query, where, orderBy, limit, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp, collectionGroup } from '@react-native-firebase/firestore';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { getFunctions, httpsCallable, httpsCallableFromUrl } from '@react-native-firebase/functions';
import { getMessaging, onMessage, onNotificationOpenedApp, getInitialNotification, setBackgroundMessageHandler, AuthorizationStatus } from '@react-native-firebase/messaging';
import appCheck, { getToken as getAppCheckToken } from '@react-native-firebase/app-check';

// Default Firebase app
const app = getApp();

// Modular instances
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app);
export const messaging = getMessaging(app);
export const appCheckInstance = appCheck(app);
export const rtdb = database(app);
export const ServerValue = database.ServerValue;

// Firestore helpers
export { collection, doc, query, where, orderBy, limit, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp, collectionGroup };
export type { FirebaseDatabaseTypes };

// Functions helpers
export { httpsCallable, httpsCallableFromUrl };

// Messaging helpers
export { onMessage, onNotificationOpenedApp, getInitialNotification, setBackgroundMessageHandler, AuthorizationStatus };

// AppCheck helpers
export { getAppCheckToken };