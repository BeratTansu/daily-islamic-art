// src/components/LikeButton.tsx
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';

interface Props {
    isLiked: boolean;
    onPress: () => void;
    size?: number;
}

// Aptal component: state tutmaz, sadece çizer.
// Optimistic state'i veriyi sahiplenen ekran tutar (feed listesi / detay objesi).
export function LikeButton({ isLiked, onPress, size = 24 }: Props) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={spacing.sm}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Beğeniyi kaldır' : 'Beğen'}
        >
            <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={size}
                color={isLiked ? colors.like : colors.textMuted}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: spacing.xs,
    },
});