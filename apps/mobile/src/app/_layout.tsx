import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { applyStoredLocale } from '../i18n';
import { AuthProvider } from '../context/AuthContext';
import { LikeProvider } from '../context/LikeContext';
import { ToastProvider } from '../context/ToastContext';

// Splash'i elle yönetiyoruz: font yüklenene kadar açık kalsın (FOUT engeli).
// Modül seviyesinde çağrılır — component render'dan ÖNCE splash kilitlenir.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
  });

  // Kayıtlı manuel dil seçimini oku ve uygula (varsa cihaz dilini ezer).
  // Font gibi bir "hazırlık" işi — bitene kadar splash açık kalır, flash olmaz.
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    applyStoredLocale().finally(() => setLocaleReady(true));
  }, []);

  // Font yüklenince (veya hata olsa bile) splash'i bırak.
  // hideAsync ayrı useEffect'te: render'dan sonra, loaded true olunca tetiklenir.
  useEffect(() => {
    if (fontsLoaded && localeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, localeReady]);

  // Font hazır değilken hiçbir şey render etme — splash görünür kalır.
  if (!fontsLoaded || !localeReady) {
    return null;
  }

  return (
    // RNGH jestleri bu sarmalayıcı olmadan SESSİZCE çalışmaz (hata vermez).
    // flex:1 şart — yoksa yükseklik 0, dokunma alanı yok.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* LikeProvider AuthProvider'ın içinde: beğeni oturuma bağlı,
            logout olunca provider unmount olmasa da yeni login temiz feed getirir. */}
        <LikeProvider>
          {/* ToastProvider en içte: diğerlerine bağımlı değil ama Stack'i
              sarmalı ki banner tüm ekranların üstünde çizilsin. */}
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
        </LikeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}