import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import ar from './locales/ar.json'
import kuBadini from './locales/ku-badini.json'
import { LANGUAGE_CODES } from './languages'

/**
 * i18n setup.
 * - English is the fallback, so any key missing in ar/ku-badini shows in English.
 * - LanguageDetector reads the saved preference from localStorage (key
 *   `i18nextLng`) and persists changes there — so the choice survives reloads.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      'ku-badini': { translation: kuBadini },
    },
    fallbackLng: 'en',
    supportedLngs: LANGUAGE_CODES,
    // Use the exact code (e.g. "ku-badini") for lookups instead of splitting it
    // to its language part ("ku"), which has no resources and fell back to English.
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: { escapeValue: false }, // React already escapes
  })

export default i18n
