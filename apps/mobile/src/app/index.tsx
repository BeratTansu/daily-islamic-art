import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Islamic Art</Text>
      <Text style={styles.subtitle}>Kurulum çalışıyor ✓</Text>
    </View>
  );
}

// StyleSheet.create: stilleri obje olarak tanımlarsın, JSX'te style={styles.x} ile bağlarsın.
// Web'deki className yerine bu. Her key bir "stil objesi".
const styles = StyleSheet.create({
  container: {
    flex: 1,                          // ekranın tamamını kapla
    backgroundColor: colors.background,
    alignItems: 'center',             // yatayda ortala
    justifyContent: 'center',         // dikeyde ortala
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
  },
});