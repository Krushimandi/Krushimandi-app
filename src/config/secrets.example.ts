/**
 * Secrets / API Keys (EXAMPLE FILE)
 * Values are read from .env file via react-native-config.
 * See .env.example for the required environment variables.
 */

import Config from 'react-native-config';

export const secrets = {
  GOOGLE_MAPS_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',

  TRUECALLER_CLIENT_ID: Config.TRUECALLER_CLIENT_ID || '',
};
