/**
 * Environment Configuration
 * Manages different environment settings (dev, staging, prod)
 */

import { secrets } from './secrets';

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
    apiKey: secrets.FIREBASE_API_KEY,
    authDomain: secrets.FIREBASE_AUTH_DOMAIN,
    projectId: secrets.FIREBASE_PROJECT_ID,
    appId: secrets.FIREBASE_APP_ID,
  },

  GOOGLE_MAPS_API_KEY: secrets.GOOGLE_MAPS_API_KEY_DEV,

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
    apiKey: secrets.FIREBASE_API_KEY,
    authDomain: secrets.FIREBASE_AUTH_DOMAIN,
    projectId: secrets.FIREBASE_PROJECT_ID,
    appId: secrets.FIREBASE_APP_ID,
  },

  GOOGLE_MAPS_API_KEY: secrets.GOOGLE_MAPS_API_KEY_PROD,

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
