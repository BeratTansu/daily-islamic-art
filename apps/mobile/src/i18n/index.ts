import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';

export const LOCALE_STORAGE_KEY = 'userLocale';
export const SUPPORTED_LOCALES = ['tr', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const FALLBACK_LOCALE: SupportedLocale = 'tr';

// Cihaz dilini oku, desteklediğimiz bir dile eşliyorsa onu döndür, yoksa fallback.
function getDeviceLocale(): SupportedLocale {
  const deviceLang = getLocales()[0]?.languageCode;
  return SUPPORTED_LOCALES.includes(deviceLang as SupportedLocale)
    ? (deviceLang as SupportedLocale)
    : FALLBACK_LOCALE;
}

// Senkron init: cihaz diliyle hemen başlat (uygulama boş dille açılmasın).
// Kayıtlı manuel seçim varsa applyStoredLocale() sonradan ezer.
i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: getDeviceLocale(),
  fallbackLng: FALLBACK_LOCALE,
  interpolation: {
    escapeValue: false, // React Native'de HTML escape yok
  },
  react: {
    useSuspense: false, // Suspense yok, senkron init
  },
});

// AsyncStorage'daki manuel seçimi oku, varsa uygula. _layout'ta çağrılır.
export async function applyStoredLocale(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      if (stored !== i18n.language) {
        await i18n.changeLanguage(stored);
      }
    }
  } catch {
    // Okuma başarısızsa cihaz diliyle devam — sessiz geç, kritik değil.
  }
}

// Dili değiştir + kalıcı kaydet. Settings ekranından çağrılır.
export async function setLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export default i18n;