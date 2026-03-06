import { Platform } from 'react-native';
import { appCheckInstance, getAppCheckToken } from './firebaseModular';

export const initializeAppCheck = async () => {
  try {
    if (!appCheckInstance) {
      console.warn('[AppCheck] appCheckInstance is undefined – ensure @react-native-firebase/app-check is installed and linked.');
      return;
    }

    // Create RNFirebase AppCheck provider and configure per env/platform
    const provider = appCheckInstance.newReactNativeFirebaseAppCheckProvider();

    if (__DEV__) {
      // Use DEBUG provider on both platforms in development
      // Debug token is read from Firebase Console > App Check > Manage debug tokens
      provider.configure({
        android: {
          provider: 'debug',
        },
        apple: {
          provider: 'debug',
        },
      });
      
    } else if (Platform.OS === 'android') {
      // Prefer Play Integrity on Android in release
      provider.configure({
        android: { provider: 'playIntegrity' },
      });
      
    } else {
      // Conservative default on iOS: DeviceCheck (App Attest requires extra setup)
      provider.configure({
        apple: { provider: 'deviceCheck' },
      });
      
    }

    await appCheckInstance.initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });

  
  // Use modular API to avoid deprecation warnings
  const tokenResult = await getAppCheckToken(appCheckInstance);
    if (tokenResult?.token) {
      if (__DEV__) console.log('[AppCheck] Token acquired successfully');
    } else {
      console.warn('[AppCheck] Token unavailable after initialization');
    }
  } catch (error) {
    console.error('AppCheck initialization failed:', error);
  }
};

// Auto-initialize on import. If you prefer manual control, remove this call and invoke initializeAppCheck() from App bootstrap.
initializeAppCheck();
