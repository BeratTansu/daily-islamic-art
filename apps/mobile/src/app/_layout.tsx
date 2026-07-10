import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { LikeProvider } from '../context/LikeContext';

export default function RootLayout() {
  return (
    // RNGH jestleri bu sarmalayıcı olmadan SESSİZCE çalışmaz (hata vermez).
    // flex:1 şart — yoksa yükseklik 0, dokunma alanı yok.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* LikeProvider AuthProvider'ın içinde: beğeni oturuma bağlı,
            logout olunca provider unmount olmasa da yeni login temiz feed getirir. */}
        <LikeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </LikeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}