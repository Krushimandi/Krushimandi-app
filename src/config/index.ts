/**
 * Environment Configuration
 * Manages different environment settings (dev, staging, prod)
 */

export interface Config {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  ENABLE_FLIPPER: boolean;
  ENABLE_LOGS: boolean;
  
  // Third-party service keys
  GOOGLE_MAPS_API_KEY: string;
  RAZORPAY_KEY_ID: string;
  FIREBASE_CONFIG: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  
  // Feature flags
  FEATURES: {
    BIOMETRIC_AUTH: boolean;
    DARK_MODE: boolean;
    OFFLINE_MODE: boolean;
    ANALYTICS: boolean;
    CRASHLYTICS: boolean;
  };
}

const development: Config = {
  API_BASE_URL: 'https://dev-api.krushimandi.com/v1',
  API_TIMEOUT: 30000,
  APP_NAME: 'KrushiMandi Dev',
  APP_VERSION: '1.0.0-dev',
  ENVIRONMENT: 'development',
  ENABLE_FLIPPER: __DEV__,
  ENABLE_LOGS: true,
  
  GOOGLE_MAPS_API_KEY: 'your-dev-google-maps-key',
  RAZORPAY_KEY_ID: 'your-dev-razorpay-key',
  FIREBASE_CONFIG: {
    apiKey: 'your-dev-firebase-api-key',
    authDomain: 'krushimandi-dev.firebaseapp.com',
    projectId: 'krushimandi-dev',
    storageBucket: 'krushimandi-dev.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:android:dev-app-id',
  },
  
  FEATURES: {
    BIOMETRIC_AUTH: true,
    DARK_MODE: true,
    OFFLINE_MODE: false,
    ANALYTICS: false,
    CRASHLYTICS: false,
  },
};

const production: Config = {
  API_BASE_URL: 'https://api.krushimandi.com/v1',
  API_TIMEOUT: 30000,
  APP_NAME: 'KrushiMandi',
  APP_VERSION: '1.0.0',
  ENVIRONMENT: 'production',
  ENABLE_FLIPPER: false,
  ENABLE_LOGS: false,
  
  GOOGLE_MAPS_API_KEY: 'your-prod-google-maps-key',
  RAZORPAY_KEY_ID: 'your-prod-razorpay-key',
  FIREBASE_CONFIG: {
    apiKey: 'your-prod-firebase-api-key',
    authDomain: 'krushimandi.firebaseapp.com',
    projectId: 'krushimandi',
    storageBucket: 'krushimandi.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:android:prod-app-id',
  },
  
  FEATURES: {
    BIOMETRIC_AUTH: true,
    DARK_MODE: true,
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
  
  // You can add logic here to switch between staging and production
  // based on build variants or environment variables
  return production;
};

export const config = getConfig();
export default config;
