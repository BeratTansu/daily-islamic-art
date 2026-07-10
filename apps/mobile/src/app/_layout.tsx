import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    // RNGH jestleri bu sarmalayıcı olmadan SESSİZCE çalışmaz (hata vermez).
    // flex:1 şart — yoksa yükseklik 0, dokunma alanı yok.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}