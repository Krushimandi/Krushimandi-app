import { firebase } from '@react-native-firebase/app-check';
import { app } from 'firebase-admin';

const firebaseAppCheckToken = async () => {
  try {
    const appCheck = await firebase.appCheck();

    const rnfbProvider = appCheck.newReactNativeFirebaseAppCheckProvider();

    rnfbProvider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: '35515E03-8C57-424C-8D9B-FBC0E1856296'
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
        debugToken: '35515E03-8C57-424C-8D9B-FBC0E1856296'
      }
    });

    console.log("Initializing AppCheck with provider:", rnfbProvider);

    await appCheck.initializeAppCheck({
      provider: rnfbProvider,
      isTokenAutoRefreshEnabled: true
    });

    const appCheckTokenFB = await appCheck.getToken();

    const isTokenValid = appCheckTokenFB.token;
    if (isTokenValid) {
      // Perform Action for the legal device
      console.log("AppCheck token is valid. Device is verified.", isTokenValid);

    } else {
      // Perform Action for illegal device
      console.log("AppCheck token is invalid. Device is not verified.");
    }

  } catch (e) {
    // Handle Errors which can happen during token generation
    console.log("Error occurred while generating AppCheck token:", e);
  }
};

firebaseAppCheckToken();
