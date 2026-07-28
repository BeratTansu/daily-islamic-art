import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontWeight, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
    fontSize: fontSize.heading,
    color: c.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  buttonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    // background DEGIL onPrimary: koyu modda background koyu kahve →
    // koyu yesil butonun ustunde okunmazdi. onPrimary "primary zemini
    // ustundeki metin" sozlesmesi, iki palette de dogru.
    color: c.onPrimary,
  },
});