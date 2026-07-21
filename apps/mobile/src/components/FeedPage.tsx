import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import {
    artworkService,
    ArtworkListItem,
    ArtworkSort,
} from '../lib/artworks/artworkService';
import { useLike } from '../lib/artworks/useLike';
import { useLikeContext } from '../context/LikeContext';
import { LikeButton } from './LikeButton';
import { displayLikeCount } from '../lib/artworks/likeCount';
import { colors, spacing, fontSize, fontWeight, fontFamily } from '../constants/theme';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

const PAGE_LIMIT = 10;

// Tek bir siralama sayfasi. Pager bunu 3 kez (newest/oldest/mostLiked) render eder.
// Her sayfa KENDI state'ini tutar (items/page/hasMore) — izolasyon.
// sort PROP olarak gelir (state degil): useCallback dependency'leri temiz kalir.
export function FeedPage({
    sort,
    onDailyRefresh,
}: {
    sort: ArtworkSort;
    onDailyRefresh: () => Promise<void>;
}) {
    const [items, setItems] = useState<ArtworkListItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { toggle, likeOnly } = useLike();
    const { getIsLiked, clear: clearLikeOverrides } = useLikeContext();

    // Ilk sayfa. newest ise sort GONDERILMEZ (cache tekilligi — REFERANS karari).
    const loadFirstPage = useCallback(async (refresh = false) => {
        setError(null);
        try {
            const res = await artworkService.list({
                page: 1,
                limit: PAGE_LIMIT,
                refresh,
                ...(sort !== 'newest' && { sort }),
            });
            setItems(res.items);
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch (e) {
            setError('Eserler yüklenemedi.');
        }
    }, [sort]);

    // Acilis — bu sayfa mount olunca kendi verisini ceker.
    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            await loadFirstPage();
            if (active) setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [loadFirstPage]);

    // Pull-to-refresh: bu sayfayi + daily'yi yeniler (daily ustte, callback ile).
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadFirstPage(true), onDailyRefresh()]);
        clearLikeOverrides();
        setRefreshing(false);
    }, [loadFirstPage, onDailyRefresh, clearLikeOverrides]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await artworkService.list({
                page: next,
                limit: PAGE_LIMIT,
                ...(sort !== 'newest' && { sort }),
            });
            setItems((prev) => {
                const seen = new Set(prev.map((it) => it.id));
                const yeniler = res.items.filter((it) => !seen.has(it.id));
                return [...prev, ...yeniler];
            });
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch {
            // alt sayfa hatasi sessiz
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, loading, page, sort]);

    const goToDetail = useCallback((slug: string) => {
        router.push({ pathname: '/artwork/[slug]', params: { slug } });
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: ArtworkListItem }) => (
            <ArtworkCard
                item={item}
                isLiked={getIsLiked(item.id, item.isLiked)}
                onPress={goToDetail}
                onToggleLike={toggle}
                onDoubleTapLike={likeOnly}
            />
        ),
        [goToDetail, toggle, likeOnly, getIsLiked],
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error && items.length === 0) {
        return <ErrorState message={error} onAction={onRefresh} />;
    }

    return (
        <Tabs.FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListFooterComponent={
                loadingMore ? (
                    <View style={styles.footer}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : null
            }
            ListEmptyComponent={
                <EmptyState icon="image-outline" message="Henüz eser yok." />
            }
        />
    );
}

// --- Kalp + begeni sayisi (feed kartinda) ---
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

// --- Gorsel jesti (cift dokunma begen / tek dokunma detay) ---
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

// --- Feed karti ---
function ArtworkCard({
    item,
    isLiked,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    item: ArtworkListItem;
    isLiked: boolean;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    const gesture = useImageGesture(item.id, item.slug, isLiked, onPress, onDoubleTapLike);

    return (
        <View style={styles.card}>
            <GestureDetector gesture={gesture}>
                <Image
                    source={{ uri: item.thumbUrl ?? item.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
            </GestureDetector>

            <View style={styles.metaRow}>
                <Pressable style={styles.metaText} onPress={() => onPress(item.slug)}>
                    <Text style={styles.cardArtist} numberOfLines={1}>
                        {item.artist.name}
                    </Text>
                </Pressable>
                <LikeMeta
                    id={item.id}
                    baseCount={item.likeCount}
                    backendIsLiked={item.isLiked ?? false}
                    displayIsLiked={isLiked}
                    onToggleLike={onToggleLike}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    listContent: {
        padding: spacing.md,
        backgroundColor: colors.background,
        flexGrow: 1,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardImage: {
        width: '100%',
        aspectRatio: 1,
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
    cardArtist: {
        fontSize: fontSize.heading,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    footer: {
        paddingVertical: spacing.lg,
    },
});