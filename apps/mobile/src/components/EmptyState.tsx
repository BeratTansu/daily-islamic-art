import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  // Opsiyonel CTA — verilmezse buton render edilmez
  actionLabel?: string;
  onAction?: () => void;
  // Liste footer'ı gibi yüksekliği belirsiz yerlerde flex:1 layout bozar.
  // Tam ekran (feed/search) → true (default). Footer içi → false.
  fillScreen?: boolean;
};

export function EmptyState({
  icon,
  message,
  actionLabel,
  onAction,
  fillScreen = true,
}: Props) {
  return (
    <View style={[styles.wrap, !fillScreen && styles.wrapCompact]}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
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
  wrapCompact: {
    flex: 0,
    paddingVertical: spacing.xl,
  },
  message: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background, // primary üstünde beyaz
  },
});