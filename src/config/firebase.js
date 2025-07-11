// Firebase initialization for React Native with modular SDK
import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Get Firebase service instances
const firebaseAuth = auth();
const firebaseFirestore = firestore();

// Initialize Firebase services
const initializeFirebase = async () => {
  try {
    console.log('🔥 Initializing Firebase services...');
    
    // Firebase Auth is automatically initialized and persistent
    console.log('🔥 Firebase Auth initialized with persistence enabled');
    
    // Optional: Configure Firestore settings
    await firebaseFirestore.settings({
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
export { firebaseAuth as auth, firebaseFirestore as firestore };
