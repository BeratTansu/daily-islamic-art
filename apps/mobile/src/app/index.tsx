import { useEffect } from 'react';
import { ApiClient } from '@/lib/auth/apiClient';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { AuthService } from '@/lib/auth/authService';

export default function Index() {
  useEffect(() => {
    AuthService.isLoggedIn().then((v) => {
      console.log('Açılışta isLoggedIn:', v);
    });
  }, []);

  const handleLogin = async () => {
    try {
      await AuthService.login('admin2@dia.app', 'Admin123!');
      console.log('✅ Login başarılı');

      // ASIL NİYET TESTİ: korumalı endpoint.
      // auth belirtmiyoruz → default auth:true → buildHeaders token'ı okuyup
      // Authorization: Bearer header'ı ekleyecek. 200 dönerse header doğru gitti.
      const me = await ApiClient.get('/auth/me');
      console.log('✅ /auth/me:', me); // { id, email, displayName, role } beklenir

      Alert.alert('Başarılı', 'Login + /auth/me çalıştı.');
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Bir şey başarısız oldu.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Islamic Art</Text>
      <Text style={styles.subtitle}>Kurulum çalışıyor ✓</Text>

      <View style={styles.button}>
        <Button
          title="Test Login"
          onPress={handleLogin}
        />
      </View>
    </View>
  );
}

// StyleSheet.create: stilleri obje olarak tanımlarsın, JSX'te style={styles.x} ile bağlarsın.
// Web'deki className yerine bu. Her key bir "stil objesi".
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    width: '80%',
  },
});