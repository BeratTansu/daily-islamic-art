import { useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStorage } from '../lib/onboarding/onboardingStorage';
import { colors, spacing, fontSize, fontFamily } from '../constants/theme';

// Slide'lar i18n key'leriyle tanimlanir — metin JSON'da tek kaynak.
const SLIDES = [
    { key: 'slide1', icon: '✦' },
    { key: 'slide2', icon: '✦' },
    { key: 'slide3', icon: '✦' },
];

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const listRef = useRef<FlatList>(null);
    const [index, setIndex] = useState(0);

    const isLast = index === SLIDES.length - 1;

    async function finish() {
        await OnboardingStorage.markCompleted();
        // replace: onboarding'e geri donulmemeli.
        // /welcome'a gidiyoruz — misafir akisi index.tsx'teki mantikla ayni.
        router.replace('/welcome');
    }

    function goNext() {
        if (isLast) {
            finish();
            return;
        }
        listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
    }

    // Scroll bitince aktif index'i guncelle (nokta gostergesi + buton metni icin).
    function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
        const next = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(next);
    }

    return (
        <View style={styles.container}>
            <Pressable style={styles.skip} onPress={finish} hitSlop={12}>
                <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </Pressable>

            <FlatList
                ref={listRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <Text style={styles.icon}>{item.icon}</Text>
                        <Text style={styles.title}>{t(`onboarding.${item.key}Title`)}</Text>
                        <Text style={styles.body}>{t(`onboarding.${item.key}Body`)}</Text>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((s, i) => (
                        <View
                            key={s.key}
                            style={[styles.dot, i === index && styles.dotActive]}
                        />
                    ))}
                </View>

                <Pressable style={styles.button} onPress={goNext}>
                    <Text style={styles.buttonText}>
                        {isLast ? t('onboarding.start') : t('onboarding.next')}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    skip: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.lg,
        zIndex: 1,
        padding: spacing.sm,
    },
    skipText: {
        fontSize: fontSize.body,
        color: colors.textMuted,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    icon: {
        fontSize: 32,
        color: colors.accent,
        marginBottom: spacing.lg,
    },
    title: {
        // fontFamily kullanildiginda fontWeight YAZILMAZ (RN sistem fontuna duser).
        fontFamily: fontFamily.serif,
        fontSize: fontSize.title,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    body: {
        fontSize: fontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl * 1.5,
        gap: spacing.lg,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        backgroundColor: colors.accent,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: fontSize.body,
        color: colors.background,
    },
});