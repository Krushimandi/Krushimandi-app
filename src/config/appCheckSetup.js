import { Platform } from 'react-native';
import { appCheckInstance, getAppCheckToken } from './firebaseModular';

// Allow tests/advanced bootstraps to opt-out of auto initialization by setting
// global.__DISABLE_APPCHECK_AUTO_INIT__ = true
const AUTO_INIT_DISABLED = typeof global !== 'undefined' && global.__DISABLE_APPCHECK_AUTO_INIT__;

/**
 * Initialize Firebase App Check.
 * Returns the token string when available, otherwise null.
 * Options:
 *  - enableAutoRefresh: boolean (default: true)
 *  - debugToken: string (default: existing debug token)
 */
export const initializeAppCheck = async ({ enableAutoRefresh = true, debugToken = '35515E03-8C57-424C-8D9B-FBC0E1856296' } = {}) => {
  try {
    if (!appCheckInstance) {
      console.warn('[AppCheck] appCheckInstance is undefined – ensure @react-native-firebase/app-check is installed and linked.');
      return null;
    }

    console.debug('[AppCheck] Starting initialization (platform=', Platform.OS, ', __DEV__=', __DEV__, ')');

    const provider = appCheckInstance.newReactNativeFirebaseAppCheckProvider();

    if (__DEV__) {
      // Use DEBUG provider on both platforms in development
      provider.configure({
        android: { provider: 'debug', debugToken },
        apple: { provider: 'debug', debugToken },
      });
      console.info('[AppCheck] Configured debug provider for development');

    } else if (Platform.OS === 'android') {
      // Use Play Integrity for Android releases
      provider.configure({ android: { provider: 'playIntegrity' } });
      console.info('[AppCheck] Configured Play Integrity for Android');

    } else {
      // Conservative default on iOS
      provider.configure({ apple: { provider: 'deviceCheck' } });
      console.info('[AppCheck] Configured DeviceCheck for iOS');
    }

    await appCheckInstance.initializeAppCheck({ provider, isTokenAutoRefreshEnabled: enableAutoRefresh });

    const tokenResult = await getAppCheckToken(appCheckInstance);
    if (tokenResult?.token) {
      console.info('[AppCheck] Token acquired (length=', tokenResult.token.length, ')');
      return tokenResult.token;
    }

    console.warn('[AppCheck] Token unavailable after initialization');
    return null;

  } catch (error) {
    console.error('[AppCheck] Initialization failed:', error);
    return null;
  }
};

// Auto-initialize on import by default. Set global.__DISABLE_APPCHECK_AUTO_INIT__ = true to opt-out.
if (!AUTO_INIT_DISABLED) {
  initializeAppCheck().catch(err => console.error('[AppCheck] Auto-init error:', err));
}
