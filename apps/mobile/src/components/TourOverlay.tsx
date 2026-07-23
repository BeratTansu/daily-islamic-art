import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTour, type TourTargetKey } from '../context/TourContext';
import { OnboardingStorage } from '../lib/onboarding/onboardingStorage';
import { colors, spacing, fontSize, fontFamily } from '../constants/theme';

// Delik cevresindeki bosluk — hedef nefes alsin.
const PADDING = 8;
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
// Alt tab bar yuksekligi (expo-router varsayilani). Cihazda oturmaziyorsa ayarla.
const TAB_BAR_H = 56;

interface TourStep {
    key: string;
    target: TourTargetKey | null; // null = hedefsiz adim (sadece metin)
}

const STEPS: TourStep[] = [
    { key: 'step1', target: 'dailyCard' },
    { key: 'step2', target: 'likeButton' },
    { key: 'step3', target: 'sortTabs' },
    { key: 'step4', target: 'collectionsTab' },
];

export function TourOverlay() {
    const { t } = useTranslation();
    const { isActive, endTour, getTarget } = useTour();
    const { width: screenW, height: screenH } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);

    if (!isActive) return null;

    const step = STEPS[index];
    const isLast = index === STEPS.length - 1;

    async function finish() {
        await OnboardingStorage.markCompleted();
        endTour();
    }

    function next() {
        if (isLast) {
            finish();
            return;
        }
        setIndex((i) => i + 1);
    }

    // Hedef konumu: normalde TourTarget'in olctugu rect.
    // Koleksiyonlar sekmesi istisna — expo-router'in tab bar'inda, saramayiz.
    // Konum hesaplanir: bar ekranin altinda, uc sekme esit genislikte, orta olan.
    const measured = step.target ? getTarget(step.target) : null;
    const targetRect =
        step.target === 'collectionsTab'
            ? {
                  x: screenW / 3,
                  y: screenH - TAB_BAR_H - insets.bottom,
                  width: screenW / 3,
                  height: TAB_BAR_H,
              }
            : measured;

    // Delik koordinatlari — hedef yoksa tam karartma (delik cizilmez).
    const hole = targetRect
        ? {
              x: Math.max(0, targetRect.x - PADDING),
              y: Math.max(0, targetRect.y - PADDING),
              w: targetRect.width + PADDING * 2,
              h: targetRect.height + PADDING * 2,
          }
        : null;

    // Ipucu kutusu delige carpmasin: delik ekranin ust yarisindaysa kutu ALTTA,
    // alt yarisindaysa kutu USTTE.
    const boxAtBottom = hole ? hole.y + hole.h < screenH * 0.6 : true;

    return (
        // Modal: tab bar DAHIL tum ekrani kaplar. Duz View kullanilsaydi
        // overlay sadece bu ekranin icinde kalir, alt tab bar'a basilabilirdi.
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
            <View style={StyleSheet.absoluteFill}>
                {hole ? (
                    <>
                        {/* Dort parca: ust / alt / sol / sag — ortada delik kalir. */}
                        <View style={[styles.mask, { top: 0, left: 0, right: 0, height: hole.y }]} />
                        <View
                            style={[
                                styles.mask,
                                { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 },
                            ]}
                        />
                        <View
                            style={[
                                styles.mask,
                                { top: hole.y, left: 0, width: hole.x, height: hole.h },
                            ]}
                        />
                        <View
                            style={[
                                styles.mask,
                                {
                                    top: hole.y,
                                    left: hole.x + hole.w,
                                    width: screenW - (hole.x + hole.w),
                                    height: hole.h,
                                },
                            ]}
                        />
                        {/* Delik kenarligi — spotlight hissi */}
                        <View
                            pointerEvents="none"
                            style={[
                                styles.holeBorder,
                                { top: hole.y, left: hole.x, width: hole.w, height: hole.h },
                            ]}
                        />
                    </>
                ) : (
                    <View style={[styles.mask, { top: 0, left: 0, right: 0, bottom: 0 }]} />
                )}

                {/* Ipucu kutusu */}
                <View
                    style={[
                        styles.box,
                        boxAtBottom ? { bottom: spacing.xl * 2 } : { top: spacing.xl * 3 },
                    ]}
                >
                    <Text style={styles.title}>{t(`tour.${step.key}Title`)}</Text>
                    <Text style={styles.body}>{t(`tour.${step.key}Body`)}</Text>

                    <View style={styles.footer}>
                        <View style={styles.dots}>
                            {STEPS.map((s, i) => (
                                <View
                                    key={s.key}
                                    style={[styles.dot, i === index && styles.dotActive]}
                                />
                            ))}
                        </View>

                        <View style={styles.actions}>
                            {index > 0 && (
                                <Pressable onPress={() => setIndex((i) => i - 1)} hitSlop={8}>
                                    <Text style={styles.skip}>{t('tour.back')}</Text>
                                </Pressable>
                            )}
                            <Pressable onPress={finish} hitSlop={8}>
                                <Text style={styles.skip}>{t('tour.skip')}</Text>
                            </Pressable>
                            <Pressable style={styles.button} onPress={next}>
                                <Text style={styles.buttonText}>
                                    {isLast ? t('tour.done') : t('tour.next')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    mask: {
        position: 'absolute',
        backgroundColor: OVERLAY_COLOR,
    },
    holeBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: colors.accent,
        borderRadius: 12,
    },
    box: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    title: {
        fontFamily: fontFamily.serif,
        fontSize: fontSize.title,
        color: colors.text,
    },
    body: {
        fontSize: fontSize.body,
        color: colors.textMuted,
        lineHeight: 21,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    dots: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        backgroundColor: colors.accent,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    skip: {
        fontSize: fontSize.body,
        color: colors.textMuted,
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    buttonText: {
        fontSize: fontSize.body,
        color: colors.background,
    },
});