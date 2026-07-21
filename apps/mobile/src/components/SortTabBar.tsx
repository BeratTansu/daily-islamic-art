import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import type { TabBarProps } from 'react-native-collapsible-tab-view';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

const TAB_COUNT = 3;

export function SortTabBar({
    indexDecimal,
    index,
    tabNames,
    onTabPress,
}: TabBarProps) {
    // Bar'in IC genisligini olc (padding sonrasi). Indicator bunun uzerinden
    // hesaplanir — Dimensions.get degil, cunku padding/rotasyon yalan soyler.
    const [innerWidth, setInnerWidth] = useState(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setInnerWidth(e.nativeEvent.layout.width);
    }, []);

    const tabWidth = innerWidth / TAB_COUNT;

    // Indicator: X pozisyonu indexDecimal'i BIREBIR takip eder (parmakla akar).
    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indexDecimal.value * tabWidth }],
        width: tabWidth,
    }));

    return (
        <View style={styles.wrap}>
            <View style={styles.inner} onLayout={onLayout}>
                {/* Kayan indicator — sekmelerin ALTINDA ince cizgi */}
                {innerWidth > 0 && (
                    <Animated.View style={[styles.indicator, indicatorStyle]} />
                )}

                {tabNames.map((name, i) => {
                    // Aktif sekme: su an index integer'a en yakin olan.
                    // (Metin rengi icin yeterli; indicator zaten smooth.)
                    const focused = index.value === i;
                    return (
                        <Pressable
                            key={name}
                            style={styles.tab}
                            onPress={() => onTabPress(name)}
                        >
                            <TabLabel
                                indexDecimal={indexDecimal}
                                position={i}
                                label={LABELS[name] ?? name}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// Sekme adi → gorunen etiket. feed.tsx'teki Tab name'leriyle BIREBIR eslesmeli.
const LABELS: Record<string, string> = {
    mostLiked: 'En Beğenilen',
    newest: 'En Yeni',
    oldest: 'En Eski',
};

// Etiket rengi indexDecimal'e gore interpolate — aktife yaklastikca
// textMuted'tan primary'ye gecer. Boylece renk de smooth akar.
function TabLabel({
    indexDecimal,
    position,
    label,
}: {
    indexDecimal: TabBarProps['indexDecimal'];
    position: number;
    label: string;
}) {
    const style = useAnimatedStyle(() => {
        // Bu sekmeye olan "uzaklik" (0 = tam ustunde, 1 = komsu).
        const dist = Math.abs(indexDecimal.value - position);
        const t = interpolate(dist, [0, 1], [1, 0], Extrapolation.CLAMP);
        return { opacity: interpolate(t, [0, 1], [0.55, 1]) };
    });

    return (
        <Animated.Text style={[styles.label, style]}>{label}</Animated.Text>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    inner: {
        flexDirection: 'row',
        position: 'relative',
        // Alt cizgi zemini (indicator bunun uzerinde kayar)
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    label: {
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
    indicator: {
        position: 'absolute',
        bottom: -1, // borderBottom'un uzerine otursun
        left: 0,
        height: 2,
        backgroundColor: colors.primary,
        borderRadius: 1,
    },
});