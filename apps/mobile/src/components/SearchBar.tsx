import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

type SearchBarProps = {
    onPress: () => void;
    placeholder?: string;
};

// Kapı: gerçek input değil. Dokununca arama ekranına götürür.
// Feed'i iki-modlu yapmamak için burada yazılamaz (B kararı).
export function SearchBar({ onPress, placeholder }: SearchBarProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    return (
        <Pressable onPress={onPress} style={styles.bar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.placeholder}>{placeholder}</Text>
        </Pressable>
    );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: c.surface,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        height: 44,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    placeholder: {
        fontSize: fontSize.heading,
        color: c.textMuted,
    },
});