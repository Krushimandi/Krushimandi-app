/**
 * Environment Configuration
 * Manages different environment settings (dev, staging, prod)
 */

export interface Config {
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  ENABLE_FLIPPER: boolean;
  ENABLE_LOGS: boolean;

  // Third-party service keys
  GOOGLE_MAPS_API_KEY: string;

  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  }
  // Feature flags
  FEATURES: {
    DARK_MODE: boolean;
    OFFLINE_MODE: boolean;
    ANALYTICS: boolean;
    CRASHLYTICS: boolean;
  };
}

const development: Config = {
  APP_NAME: 'Krushimandi',
  APP_VERSION: '1.0.0-dev',
  ENVIRONMENT: 'development',
  ENABLE_FLIPPER: __DEV__,
  ENABLE_LOGS: true,

  firebaseConfig: {
    apiKey: 'AIzaSyBwRBl7lr5hhW2lIqkJsoxf1qLnkOIIvcM',
    authDomain: 'https://krushimandi-fruit-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'krushimandi-fruit',
    appId: '1:915325221809:android:9869d311ec5c802692db90',
  },

  GOOGLE_MAPS_API_KEY: 'AIzaSyA7N1JXTOsM60RFRrCohYhm_2ZZp4Q0B3o',

  FEATURES: {
    DARK_MODE: true,
    OFFLINE_MODE: false,
    ANALYTICS: false,
    CRASHLYTICS: false,
  },
};

const production: Config = {
  APP_NAME: 'Krushiandi',
  APP_VERSION: '1.0.0',
  ENVIRONMENT: 'production',
  ENABLE_FLIPPER: false,
  ENABLE_LOGS: false,

  firebaseConfig: {
    apiKey: 'AIzaSyBwRBl7lr5hhW2lIqkJsoxf1qLnkOIIvcM',
    authDomain: 'https://krushimandi-fruit-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'krushimandi-fruit',
    appId: '1:915325221809:android:9869d311ec5c802692db90',
  },

  GOOGLE_MAPS_API_KEY: 'AIzaSyA7N1JXTOsM60RFRrCohYhm_2ZZp4Q0B3o',

  FEATURES: {
    DARK_MODE: false,
    OFFLINE_MODE: true,
    ANALYTICS: true,
    CRASHLYTICS: true,
  },
};

// Select configuration based on environment
const getConfig = (): Config => {
  if (__DEV__) {
    return development;
  }
  return production;
};

export const config = getConfig();
export default config;
