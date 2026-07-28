import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTour, type TourTargetKey } from '../context/TourContext';
import { OnboardingStorage } from '../lib/onboarding/onboardingStorage';
import { spacing, fontSize, fontFamily, type ThemeColors } from '../constants/theme';
import { useThemedStyles } from '../context/ThemeContext';

// Delik cevresindeki bosluk — hedef nefes alsin.
const PADDING = 8;
// Delik ekran kenarina ASLA degmesin (full-width hedeflerde bile nefes payi).
const EDGE_MARGIN = 12;
// Delik kose yaricapi.
const HOLE_RADIUS = 12;

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

/**
 * Tam ekran dikdortgen + yuvarlak koseli delik = tek path.
 * fillRule="evenodd" ile ic yol disari cikarilir (gercek maske, hile yok).
 * Yaricap delik boyutunun yarisini asamaz (kucuk hedeflerde bozulma onlenir).
 */
function buildMaskPath(
    screenW: number,
    screenH: number,
    hole: { x: number; y: number; w: number; h: number },
    radius: number,
): string {
    const r = Math.min(radius, hole.w / 2, hole.h / 2);
    const { x, y, w, h } = hole;

    // Dis dikdortgen (saat yonunde)
    const outer = `M0,0 H${screenW} V${screenH} H0 Z`;

    // Ic yuvarlak dikdortgen (saat yonunun TERSI — evenodd icin yon onemli degil
    // ama okunabilirlik icin tutarli yaziyoruz)
    const inner =
        `M${x + r},${y} ` +
        `H${x + w - r} ` +
        `A${r},${r} 0 0 1 ${x + w},${y + r} ` +
        `V${y + h - r} ` +
        `A${r},${r} 0 0 1 ${x + w - r},${y + h} ` +
        `H${x + r} ` +
        `A${r},${r} 0 0 1 ${x},${y + h - r} ` +
        `V${y + r} ` +
        `A${r},${r} 0 0 1 ${x + r},${y} ` +
        `Z`;

    return `${outer} ${inner}`;
}

export function TourOverlay() {
    const { t } = useTranslation();
    const { isActive, endTour, getTarget } = useTour();
    const { width: screenW, height: screenH } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(makeStyles);
    const [index, setIndex] = useState(0);

    // Hook'lar erken return'un USTUNDE (Rules of Hooks).
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
                // insets.bottom dahil: bar'in gorsel yuksekligi safe area'yi
                // da kapsiyor, TAB_BAR_H tek basina alt kismi disarida birakiyordu.
                height: TAB_BAR_H + insets.bottom,
            }
            : measured;

    // Delik koordinatlari — hedef yoksa tam karartma (delik cizilmez).
    // Once PADDING ile buyut, SONRA ekran kenarlarina EDGE_MARGIN birakacak
    // sekilde kirp. Clamp olmadan full-width hedefler (SortTabBar, tab bar)
    // ekran kenarina yapisiyordu.
    const hole = (() => {
        if (!targetRect) return null;

        const left = Math.max(targetRect.x - PADDING, EDGE_MARGIN);
        const right = Math.min(
            targetRect.x + targetRect.width + PADDING,
            screenW - EDGE_MARGIN,
        );
        const top = Math.max(targetRect.y - PADDING, EDGE_MARGIN);
        const bottom = Math.min(
            targetRect.y + targetRect.height + PADDING,
            screenH - EDGE_MARGIN,
        );

        // Bozuk olcum (ters dikdortgen) gelirse delik cizme — tam karartma.
        if (right <= left || bottom <= top) return null;

        return { x: left, y: top, w: right - left, h: bottom - top };
    })();

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
                        {/* SVG maske: dis dikdortgen + yuvarlak delik, fillRule evenodd.
                            Border/kose-dolgusu hilelerinden vazgecildi — Android'de
                            delik acilmiyordu. Bu matematiksel olarak dogru kesim. */}
                        <Svg
                            pointerEvents="none"
                            width={screenW}
                            height={screenH}
                            style={StyleSheet.absoluteFill}
                        >
                            <Path
                                d={buildMaskPath(screenW, screenH, hole, HOLE_RADIUS)}
                                fill={OVERLAY_COLOR}
                                fillRule="evenodd"
                            />
                        </Svg>

                        {/* Delik kenarligi — spotlight hissi (altin cerceve) */}
                        <View
                            pointerEvents="none"
                            style={[
                                styles.holeBorder,
                                {
                                    top: hole.y,
                                    left: hole.x,
                                    width: hole.w,
                                    height: hole.h,
                                    borderRadius: HOLE_RADIUS,
                                },
                            ]}
                        />
                    </>
                ) : (
                    <View style={[StyleSheet.absoluteFill, styles.fullMask]} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    fullMask: {
        backgroundColor: OVERLAY_COLOR,
    },
    holeBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: c.accent,
        // borderRadius inline (HOLE_RADIUS tek kaynak).
    },
    box: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: c.background,
        borderRadius: 12,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    title: {
        fontFamily: fontFamily.serif,
        fontSize: fontSize.title,
        color: c.text,
    },
    body: {
        fontSize: fontSize.body,
        color: c.textMuted,
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
        backgroundColor: c.border,
    },
    dotActive: {
        backgroundColor: c.accent,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    skip: {
        fontSize: fontSize.body,
        color: c.textMuted,
    },
    button: {
        backgroundColor: c.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    buttonText: {
        fontSize: fontSize.body,
        color: c.onPrimary,
    },
});