import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useDerivedValue,
    useAnimatedReaction,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Tabs, useHeaderMeasurements } from 'react-native-collapsible-tab-view';
import { router } from 'expo-router';
import { SearchBar } from '../../../components/SearchBar';
import { SortTabBar } from '../../../components/SortTabBar';
import {
    artworkService,
    ArtworkDetail,
    ArtworkSort,
} from '../../../lib/artworks/artworkService';
import { useLike } from '../../../lib/artworks/useLike';
import { useLikeContext } from '../../../context/LikeContext';
import { LikeButton } from '../../../components/LikeButton';
import { displayLikeCount } from '../../../lib/artworks/likeCount';
import { FeedPage } from '../../../components/FeedPage';
import { colors, spacing, fontSize, fontWeight, fontFamily } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

// Kompakt yatay kartin yuksekligi (padding dahil). Kutuphane header'i buraya
// kadar collapse eder ve durur — kompakt kart hep gorunur kalir (Hedef A).
// Buyuk kartin yuksekligi SABIT DEGIL: normal akista, kutuphane kendisi olcer.
const HEADER_MIN = 88;

export default function FeedScreen() {
    const [daily, setDaily] = useState<ArtworkDetail | null>(null);
    const [dailyLoading, setDailyLoading] = useState(true);

    const { toggle, likeOnly } = useLike();
    const { getIsLiked } = useLikeContext();

    // Daily feed.tsx'te yasar (collapse header'da, siralamadan bagimsiz).
    // FeedPage pull-to-refresh'i bu fonksiyonu callback ile cagirir.
    const loadDaily = useCallback(async (refresh = false) => {
        try {
            const d = await artworkService.getDaily(refresh);
            setDaily(d);
        } catch {
            setDaily(null);
        }
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            setDailyLoading(true);
            await loadDaily();
            if (active) setDailyLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [loadDaily]);

    const onDailyRefresh = useCallback(() => loadDaily(true), [loadDaily]);

    const goToDetail = useCallback((slug: string) => {
        router.push({ pathname: '/artwork/[slug]', params: { slug } });
    }, []);

    // Collapse header artik ayri bir component (DailyHeader) — cunku useCurrentTabScrollY
    // hook'u Tabs.Container context'i icinde cagrilmali. renderHeader sadece onu render eder.
    const renderHeader = useCallback(() => {
        if (!daily) {
            // Daily gelmese de arama kapisi kaybolmasin.
            return (
                <View style={styles.headerContent} pointerEvents="box-none">
                    <View style={styles.searchInHeader}>
                        <SearchBar onPress={() => router.push('/search')} />
                    </View>
                </View>
            );
        }
        return (
            <DailyHeader
                daily={daily}
                isLiked={getIsLiked(daily.id, daily.isLiked)}
                onPress={goToDetail}
                onToggleLike={toggle}
                onDoubleTapLike={likeOnly}
            />
        );
    }, [daily, getIsLiked, goToDetail, toggle, likeOnly]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Tabs.Container
                renderHeader={renderHeader}
                renderTabBar={(props) => <SortTabBar {...props} />}
                initialTabName="newest"
                lazy
                minHeaderHeight={HEADER_MIN}
                headerContainerStyle={styles.headerContainer}
            >
                <Tabs.Tab name="mostLiked" label="En Beğenilen">
                    <FeedPage sort="mostLiked" onDailyRefresh={onDailyRefresh} />
                </Tabs.Tab>
                <Tabs.Tab name="newest" label="En Yeni">
                    <FeedPage sort="newest" onDailyRefresh={onDailyRefresh} />
                </Tabs.Tab>
                <Tabs.Tab name="oldest" label="En Eski">
                    <FeedPage sort="oldest" onDailyRefresh={onDailyRefresh} />
                </Tabs.Tab>
            </Tabs.Container>
        </SafeAreaView>
    );
}

// --- Gorsel jesti (daily kartinda) ---
function useImageGesture(
    id: string,
    slug: string,
    isLiked: boolean,
    onPress: (slug: string) => void,
    onDoubleTapLike: (id: string, isLiked: boolean) => void,
) {
    return useMemo(() => {
        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .maxDelay(180)
            .onEnd(() => {
                runOnJS(onDoubleTapLike)(id, isLiked);
            });

        const singleTap = Gesture.Tap().onEnd(() => {
            runOnJS(onPress)(slug);
        });

        return Gesture.Exclusive(doubleTap, singleTap);
    }, [id, slug, isLiked, onPress, onDoubleTapLike]);
}

// --- Kalp + begeni sayisi (daily kartinda) ---
function LikeMeta({
    id,
    baseCount,
    backendIsLiked,
    displayIsLiked,
    onToggleLike,
}: {
    id: string;
    baseCount: number;
    backendIsLiked: boolean;
    displayIsLiked: boolean;
    onToggleLike: (id: string, isLiked: boolean) => void;
}) {
    const count = displayLikeCount(baseCount, backendIsLiked, displayIsLiked);
    return (
        <View style={styles.likeMeta}>
            <LikeButton isLiked={displayIsLiked} onPress={() => onToggleLike(id, displayIsLiked)} />
            {count > 0 && <Text style={styles.likeCount}>{count}</Text>}
        </View>
    );
}

function DailyHeader({
    daily,
    isLiked,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    daily: ArtworkDetail;
    isLiked: boolean;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    // top: header'in anlik kaydirma degeri (0 → -(yukseklik - HEADER_MIN)).
    // height: header'in OLCULMUS yuksekligi. Animasyonu scrollY degil BU surer:
    // collapse'in gercegine kilitli → tab degisince zipla/yarim kalma olmaz.
    const { top, height } = useHeaderMeasurements();

    // Kompakt kart gorunmezken dokunmayi calmasin diye pointerEvents state'i.
    // Worklet'ten React state'e gecis runOnJS ile (REFERANS kurali).
    const [compactActive, setCompactActive] = useState(false);

    // 0 → 1 collapse ilerlemesi.
    const progress = useDerivedValue(() => {
        const total = (height ?? 0) - HEADER_MIN;
        if (total <= 0) return 0;
        const p = -top.value / total;
        return p < 0 ? 0 : p > 1 ? 1 : p;
    });

    useAnimatedReaction(
        () => progress.value > 0.5,
        (aktif, onceki) => {
            if (aktif !== onceki) runOnJS(setCompactActive)(aktif);
        },
    );

    const bigStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
        transform: [
            {
                scale: interpolate(progress.value, [0, 0.6], [1, 0.94], Extrapolation.CLAMP),
            },
        ],
    }));

    const compactStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0.35, 0.9], [0, 1], Extrapolation.CLAMP),
        transform: [
            {
                translateY: interpolate(progress.value, [0.35, 1], [24, 0], Extrapolation.CLAMP),
            },
            {
                scale: interpolate(progress.value, [0.35, 1], [0.92, 1], Extrapolation.CLAMP),
            },
        ],
    }));

    return (
        <View style={styles.headerContent} pointerEvents="box-none">
            {/* Arama: header'in en ustunde, normal akista. Fade OLMAZ — header'la
                beraber yukari kayar, collapsed'da gorunmez, en uste donunce gelir. */}
            <View style={styles.searchInHeader}>
                <SearchBar onPress={() => router.push('/search')} />
            </View>

            {/* Buyuk kart: NORMAL AKISTA (absolute degil) → header dogal yuksekligini
                bundan alir, kutuphane dogru olcer. Scroll'la sadece soner. */}
            <Animated.View style={bigStyle} pointerEvents={compactActive ? 'none' : 'box-none'}>
                <Text style={styles.dailyLabel}>Günün Eseri</Text>
                <DailyCard
                    daily={daily}
                    isLiked={isLiked}
                    onPress={onPress}
                    onToggleLike={onToggleLike}
                    onDoubleTapLike={onDoubleTapLike}
                />
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerMark}>✦</Text>
                    <View style={styles.dividerLine} />
                </View>
            </Animated.View>

            {/* Kompakt kart: absolute EN ALTTA. Collapse bitince gorunur kalan serit
                tam bu — HEADER_MIN yuksekligindeki alt kisim. */}
            <Animated.View
                style={[styles.compactLayer, compactStyle]}
                pointerEvents={compactActive ? 'box-none' : 'none'}
            >
                <CompactDailyCard
                    daily={daily}
                    isLiked={isLiked}
                    onPress={onPress}
                    onToggleLike={onToggleLike}
                />
            </Animated.View>
        </View>
    );
}

// Kompakt daily: kucuk yatay kart (thumbnail + isim + kalp). Buyuk kartin morph hedefi.
function CompactDailyCard({
    daily,
    isLiked,
    onPress,
    onToggleLike,
}: {
    daily: ArtworkDetail;
    isLiked: boolean;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
}) {
    return (
        <Pressable style={styles.compactCard} onPress={() => onPress(daily.slug)}>
            <Image
                source={{ uri: daily.thumbUrl ?? daily.imageUrl }}
                style={styles.compactImage}
                resizeMode="cover"
            />
            <View style={styles.compactInfo}>
                <Text style={styles.compactArtist} numberOfLines={1}>
                    {daily.artist.name}
                </Text>
                <Text style={styles.compactLabel}>Bugünün eseri</Text>
            </View>
            <LikeMeta
                id={daily.id}
                baseCount={daily.likeCount}
                backendIsLiked={daily.isLiked}
                displayIsLiked={isLiked}
                onToggleLike={onToggleLike}
            />
        </Pressable>
    );
}

// --- Gunun eseri karti ---
function DailyCard({
    daily,
    isLiked,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    daily: ArtworkDetail;
    isLiked: boolean;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    const gesture = useImageGesture(daily.id, daily.slug, isLiked, onPress, onDoubleTapLike);

    return (
        <View style={styles.dailyWrap}>
            <View style={styles.dailyCard}>
                <GestureDetector gesture={gesture}>
                    <Image
                        source={{ uri: daily.thumbUrl ?? daily.imageUrl }}
                        style={styles.dailyImage}
                        resizeMode="cover"
                    />
                </GestureDetector>

                <View style={styles.metaRow}>
                    <Pressable style={styles.metaText} onPress={() => onPress(daily.slug)}>
                        <Text style={styles.dailyArtist} numberOfLines={1}>
                            {daily.artist.name}
                        </Text>
                    </Pressable>
                    <LikeMeta
                        id={daily.id}
                        baseCount={daily.likeCount}
                        backendIsLiked={daily.isLiked}
                        displayIsLiked={isLiked}
                        onToggleLike={onToggleLike}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    searchInHeader: {
        paddingTop: spacing.sm,
        marginBottom: spacing.md,
    },
    headerContainer: {
        backgroundColor: colors.background,
        // Collapse header'in golge/border'i yok — krem zemine kaynasin.
        elevation: 0,
        shadowOpacity: 0,
    },
    headerContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    // Kompakt kart en altta — header collapse olunca bu kisim gorunur kalir.
    compactLayer: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.md,
        right: spacing.md,
    },
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
    },
    compactImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
    compactInfo: {
        flex: 1,
        minWidth: 0,
    },
    compactArtist: {
        fontSize: 17,
        fontFamily: fontFamily.serif,
        color: colors.text,
    },
    compactLabel: {
        fontSize: fontSize.caption,
        color: colors.textMuted,
    },
    dailyWrap: {
        marginBottom: spacing.md,
    },
    dailyLabel: {
        color: colors.accent,
        fontSize: fontSize.caption,
        fontWeight: fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: spacing.sm,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        alignSelf: 'center',
        maxWidth: 200,
        marginTop: spacing.xs,
        marginBottom: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.accent,
    },
    dividerMark: {
        color: colors.accent,
        fontSize: 14,
    },
    dailyArtist: {
        fontSize: 22,
        fontFamily: fontFamily.serif,
        color: colors.text,
    },
    dailyCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    dailyImage: {
        width: '100%',
        aspectRatio: 4 / 3,
        backgroundColor: colors.surface,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    metaText: {
        flex: 1,
        marginRight: spacing.sm,
    },
    likeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    likeCount: {
        fontSize: fontSize.caption,
        color: colors.textMuted,
    },
});