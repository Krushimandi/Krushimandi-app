import { Platform } from 'react-native';
import { appCheckInstance } from './firebaseModular';

/**
 * App Check initialization (react-native-firebase v22.x)
 * Valid provider factory methods (depending on platform):
 *  - newDebugProvider()
 *  - newPlayIntegrityProvider()              (Android)
 *  - newAppAttestProvider()                  (iOS 14+ with App Attest configured)
 *  - newDeviceCheckProvider()                (iOS fallback)
 *
 * We previously attempted to call an undefined method `newReactNativeFirebaseAppCheckProvider` on an undefined
 * `appCheck` value (wrong import). This caused: Cannot read property 'newReactNativeFirebaseAppCheckProvider' of undefined.
 * Fix: import the instantiated module (`appCheckInstance`) and select a real provider method.
 */

// Initializes AppCheck using the modular instance exported from firebaseModular.
// Ensures we don't repeatedly call appCheck() inline and avoids deprecated namespace patterns.
export const initializeAppCheck = async () => {
  try {
    if (!appCheckInstance) {
      console.warn('[AppCheck] appCheckInstance is undefined – ensure @react-native-firebase/app-check is installed and linked.');
      return;
    }

    let providerFactory;
    if (__DEV__) {
      // Debug provider lets you bypass attestation. Optional: set a static token.
      providerFactory = appCheckInstance.newDebugProvider();
      console.log('[AppCheck] Using DEBUG provider');
    } else if (Platform.OS === 'android') {
      if (appCheckInstance.newPlayIntegrityProvider) {
        providerFactory = appCheckInstance.newPlayIntegrityProvider();
        console.log('[AppCheck] Using Play Integrity provider');
      } else if (appCheckInstance.newSafetyNetProvider) {
        // Fallback for older RNFirebase versions (deprecated but safer than failing)
        providerFactory = appCheckInstance.newSafetyNetProvider();
        console.log('[AppCheck] Using SafetyNet fallback provider');
      }
    } else {
      // iOS path: prefer App Attest, fallback to DeviceCheck
      if (appCheckInstance.newAppAttestProvider) {
        providerFactory = appCheckInstance.newAppAttestProvider();
        console.log('[AppCheck] Using App Attest provider');
      } else if (appCheckInstance.newDeviceCheckProvider) {
        providerFactory = appCheckInstance.newDeviceCheckProvider();
        console.log('[AppCheck] Using DeviceCheck provider');
      }
    }

    if (!providerFactory) {
      console.warn('[AppCheck] No suitable provider factory found. App Check not activated.');
      return;
    }

    await appCheckInstance.initializeAppCheck({
      provider: providerFactory,
      isTokenAutoRefreshEnabled: true,
    });

    console.log('[AppCheck] initializeAppCheck invoked – fetching token...');
    const tokenResult = await appCheckInstance.getToken();
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
