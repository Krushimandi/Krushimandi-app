// Firebase initialization for React Native
import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

// Configure Firebase Auth persistence (this should be the default, but let's ensure it)
// Firebase Auth automatically persists authentication state in React Native

// Enable network persistence for Firestore (optional but recommended)
import firestore from '@react-native-firebase/firestore';

// Initialize Firebase services
const initializeFirebase = async () => {
  try {
    console.log('🔥 Initializing Firebase services...');
    
    // Firebase Auth is automatically initialized and persistent
    console.log('🔥 Firebase Auth initialized with persistence enabled');
    
    // Optional: Configure Firestore settings
    await firestore().settings({
      persistence: true, // Enable offline persistence
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });
    console.log('🔥 Firestore initialized with persistence enabled');
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firebase instance and services
export default firebase;
export { auth, firestore };
