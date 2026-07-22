import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

type Props = {
  // Zorunlu — çağıran ekran t() ile besler (i18n sızıntısı olmasın diye default yok).
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function ErrorState({ message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={onAction}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  message: {
    fontSize: fontSize.heading,
    color: colors.text, // danger değil — kırmızı metin fazla agresif, buton bağlamı yeterli
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.background, // primary üstünde beyaz
  },
});