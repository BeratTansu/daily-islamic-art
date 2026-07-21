// src/components/DiscoverPage.tsx
// Kesfet sekmesi. FeedPage'in kardesi AMA davranisi farkli (bu yuzden ayri component):
//  1) seed'li shuffle — her app acilisinda + her pull-to-refresh'te YENI seed = yeni sira.
//  2) refresh = ayni siranin tazelenmesi DEGIL, tamamen yeni karisim.
//  3) liste bitince "yeniden karistir" footer'i (212 eser sonsuz degil — durust son).
// Instagram/X Kesfet mantigi: app acilisi basi seed + istedigin an yenile.
import { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    artworkService,
    ArtworkListItem,
} from '../lib/artworks/artworkService';
import { useLike } from '../lib/artworks/useLike';
import { useLikeContext } from '../context/LikeContext';
import { colors, spacing, fontSize, fontFamily } from '../constants/theme';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ArtworkCard } from './ArtworkCard';

const PAGE_LIMIT = 10;

// Backend @IsInt bekler. 0..2e9 arasi int — her cagri farkli sira.
function makeSeed(): number {
    return Math.floor(Math.random() * 2_000_000_000);
}

export function DiscoverPage({
    onDailyRefresh,
}: {
    onDailyRefresh: () => Promise<void>;
}) {
    // Seed: lazy init → mount'ta BIR KEZ uretilir, oturum boyu sabit.
    // App yeniden acilinca yeni mount = yeni seed (app-acilisi basi kurali).
    const [seed, setSeed] = useState<number>(makeSeed);

    const [items, setItems] = useState<ArtworkListItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { toggle, likeOnly } = useLike();
    const { getIsLiked, clear: clearLikeOverrides } = useLikeContext();

    // Ilk sayfa — verilen seed ile (default: mevcut seed).
    // useSeed param'i: refresh yeni seed uretip HEMEN onu kullanmak icin
    // (setSeed async, ayni tick'te state guncel degil → seed'i elden gecir).
    const loadFirstPage = useCallback(
        async (useSeed: number) => {
            setError(null);
            try {
                const res = await artworkService.list({
                    page: 1,
                    limit: PAGE_LIMIT,
                    sort: 'shuffle',
                    seed: useSeed,
                });
                setItems(res.items);
                setPage(res.meta.page);
                setHasMore(res.meta.page < res.meta.pages);
            } catch (e) {
                setError('Eserler yüklenemedi.');
            }
        },
        [],
    );

    // Acilis — mevcut seed ile ilk sayfa.
    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            await loadFirstPage(seed);
            if (active) setLoading(false);
        })();
        return () => {
            active = false;
        };
        // seed'i BILEREK dependency'ye koymuyoruz — seed degisimi SADECE
        // refresh/reshuffle uzerinden olur, onlar loadFirstPage'i kendi cagirir.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFirstPage]);

    // Yeni karisim: yeni seed uret, state'e yaz, AYNI seed'le ilk sayfayi cek.
    const reshuffle = useCallback(async () => {
        const yeni = makeSeed();
        setSeed(yeni);
        await loadFirstPage(yeni);
    }, [loadFirstPage]);

    // Pull-to-refresh: yeni karisim + daily tazele.
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([reshuffle(), onDailyRefresh()]);
        clearLikeOverrides();
        setRefreshing(false);
    }, [reshuffle, onDailyRefresh, clearLikeOverrides]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await artworkService.list({
                page: next,
                limit: PAGE_LIMIT,
                sort: 'shuffle',
                seed, // AYNI seed → sayfalar tutarli (backend deterministik)
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
    }, [loadingMore, hasMore, loading, page, seed]);

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
                ) : !hasMore && items.length > 0 ? (
                    // Liste bitti — 212 eser sonsuz degil, durustce "yeniden karistir".
                    <Pressable style={styles.reshuffleBtn} onPress={reshuffle}>
                        <Ionicons name="shuffle" size={20} color={colors.primary} />
                        <Text style={styles.reshuffleText}>Hepsini keşfettin — yeniden karıştır</Text>
                    </Pressable>
                ) : null
            }
            ListEmptyComponent={
                <EmptyState icon="compass-outline" message="Keşfedilecek eser yok." />
            }
        />
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
    footer: {
        paddingVertical: spacing.lg,
    },
    reshuffleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        marginTop: spacing.sm,
    },
    reshuffleText: {
        fontSize: fontSize.body,
        fontFamily: fontFamily.serif,
        color: colors.primary,
    },
});