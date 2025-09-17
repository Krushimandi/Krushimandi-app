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
      provider.configure({
        android: {
          provider: 'debug',
          debugToken: '35515E03-8C57-424C-8D9B-FBC0E1856296'
        },
        apple: {
          provider: 'debug',
          debugToken: '35515E03-8C57-424C-8D9B-FBC0E1856296'
        },
      });
      console.log('[AppCheck] Using DEBUG provider');
    } else if (Platform.OS === 'android') {
      // Prefer Play Integrity on Android in release
      provider.configure({
        android: { provider: 'playIntegrity' },
      });
      console.log('[AppCheck] Using Play Integrity provider');
    } else {
      // Conservative default on iOS: DeviceCheck (App Attest requires extra setup)
      provider.configure({
        apple: { provider: 'deviceCheck' },
      });
      console.log('[AppCheck] Using DeviceCheck provider');
    }

    await appCheckInstance.initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });

  console.log('[AppCheck] initializeAppCheck invoked – fetching token...');
  // Use modular API to avoid deprecation warnings
  const tokenResult = await getAppCheckToken(appCheckInstance);
    if (tokenResult?.token) {
      console.log('✅ [AppCheck] Token acquired (length):', tokenResult.token.length);
    } else {
      console.warn('⚠️ [AppCheck] Token unavailable after initialization');
    }
  } catch (error) {
    console.error('AppCheck initialization failed:', error);
  }
};

// Auto-initialize on import. If you prefer manual control, remove this call and invoke initializeAppCheck() from App bootstrap.
initializeAppCheck();
