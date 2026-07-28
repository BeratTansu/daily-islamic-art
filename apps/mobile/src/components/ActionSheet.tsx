import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, fontSize, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

export type ActionSheetItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
};

export function ActionSheet({ visible, onClose, items }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <Pressable
              key={i}
              style={styles.row}
              onPress={item.onPress}
              disabled={item.loading}
            >
              {item.loading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.destructive ? colors.danger : colors.text}
                />
              )}
              <Text
                style={[
                  styles.label,
                  item.destructive && { color: colors.danger },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: fontSize.heading,
    color: c.text,
  },
});