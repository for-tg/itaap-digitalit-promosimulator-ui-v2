import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import zhCN from './zh-CN.json';

export interface Language {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🌐' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },

  // Enable later if you add translations
  // { code: 'cs', label: 'Czech', flag: '🇨🇿' },
  // { code: 'de', label: 'German', flag: '🇩🇪' },
  // { code: 'fr', label: 'French', flag: '🇫🇷' },
  // { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  // { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  // { code: 'it', label: 'Italian', flag: '🇮🇹' },
  // { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  // { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  // { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  // { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
];

export const DEFAULT_LANGUAGE_CODE = 'en';

const STORAGE_KEY = 'app_language';

/** Returns the persisted language code, or the default. */
export function getStoredLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LANGUAGE_CODE;
  } catch {
    return DEFAULT_LANGUAGE_CODE;
  }
}

/** Persists the selected language code to localStorage. */
function storeLanguage(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore storage errors
  }
}

/* -------------------------------------------------------------------------- */
/* i18next initialization                                                      */
/* -------------------------------------------------------------------------- */

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    'zh-CN': {
      translation: zhCN,
    },
  },

  lng: getStoredLanguage(),

  fallbackLng: 'en',

  interpolation: {
    escapeValue: false,
  },
});

/* -------------------------------------------------------------------------- */
/* Language switcher hook used by LanguageSelector                             */
/* -------------------------------------------------------------------------- */

export async function translatePage(languageCode: string): Promise<void> {
  storeLanguage(languageCode);

  await i18n.changeLanguage(languageCode);

  document.documentElement.setAttribute('lang', languageCode);

  console.info(`[i18n] Language changed to: ${languageCode}`);
}

export default i18n;
