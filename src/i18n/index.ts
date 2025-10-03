import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';
import mr from '../locales/mr/translation.json';

export const ENABLED_LANGUAGE_CODES = ['en', 'hi', 'mr'] as const;
export type AppLanguage = typeof ENABLED_LANGUAGE_CODES[number];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
} as const;

function detectLanguage(): AppLanguage {
  const locales = RNLocalize.getLocales();
  const preferred = locales?.[0]?.languageCode as AppLanguage | undefined;
  return (preferred && (ENABLED_LANGUAGE_CODES as readonly string[]).includes(preferred))
    ? preferred as AppLanguage
    : 'en';
}

export const LANGUAGE_STORAGE_KEY = 'app.selectedLanguage';

// Note: AsyncStorage is used by LanguagesScreen; here we only initialize i18n
export function initI18n(initialLang?: AppLanguage) {
  if (!i18n.isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources: resources as any,
        lng: initialLang || detectLanguage(),
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        returnNull: false,
      });
  }
  return i18n;
}

export default i18n;
