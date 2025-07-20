import firebase from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';

const activateAppCheck = async () => {
  try {
    console.log(`AppCheck: Activating in ${__DEV__ ? 'DEBUG' : 'PROD'} mode...`);

    await appCheck().setTokenAutoRefreshEnabled(true);

    // Use 'debug' token in development
    const appCheckToken = __DEV__ 
      ? 'debug' // using debug token for development
      : 'play-integrity'; // This assumes you're using Play Integrity for release

    await appCheck().activate(appCheckToken, true);
    console.log(`✅ AppCheck activated successfully in ${__DEV__ ? 'DEBUG' : 'PROD'} mode.`);

    const tokenResult = await appCheck().getToken();
    console.log('App Check token:', tokenResult.token);
    
  } catch (error) {
    console.error('❌ AppCheck: Failed to activate App Check', error);
  }
};

// Call immediately or export
activateAppCheck();

export default firebase;