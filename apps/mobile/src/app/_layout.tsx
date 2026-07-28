import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { applyStoredLocale } from '../i18n';
import { ThemeProvider, applyStoredThemeMode, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { LikeProvider } from '../context/LikeContext';
import { TourProvider } from '../context/TourContext';
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

  // Dil + tema tercihi birlikte okunur: ikisi de "hazırlık" işi, ikisi de
  // splash altında bitmeli (yoksa açılışta krem→koyu flash olur).
  useEffect(() => {
    Promise.all([applyStoredLocale(), applyStoredThemeMode()]).finally(() =>
      setLocaleReady(true),
    );
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
      {/* ThemeProvider EN DIŞTA: Auth'a bağımlı değil, ama Toast/Tour dahil
          her overlay renk okuyacak. Ağacın tamamı tek renk kaynağını görür. */}
      <ThemeProvider>
        <AuthProvider>
          {/* LikeProvider AuthProvider'ın içinde: beğeni oturuma bağlı,
              logout olunca provider unmount olmasa da yeni login temiz feed getirir. */}
          <LikeProvider>
            {/* TourProvider: hedef koordinatlari ve tur durumu.
                ToastProvider'in disinda — tur toast'a bagimli degil. */}
            <TourProvider>
              {/* ToastProvider en içte: diğerlerine bağımlı değil ama Stack'i
                  sarmalı ki banner tüm ekranların üstünde çizilsin. */}
              <ToastProvider>
                <ThemedStack />
              </ToastProvider>
            </TourProvider>
          </LikeProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Native header temayı KENDİLİĞİNDEN takip etmez — headerShown:true yapan
 * ekranlarda (settings, artwork detay) koyu ekranın üstünde krem şerit kalırdı.
 * Ayrı component çünkü useTheme, ThemeProvider'ın İÇİNDE çağrılmalı.
 */
function ThemedStack() {
  const { colors, scheme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        // Ekranlar arası geçişte beyaz flash olmasın
        contentStyle: { backgroundColor: colors.background },
      }}
      // Modal/sheet üstündeki sistem çizimleri için şema ipucu
      key={scheme}
    />
  );
}