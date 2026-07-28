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
import { spacing, fontSize, fontFamily, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ArtworkCard } from './ArtworkCard';
import { useTranslation } from 'react-i18next';

const PAGE_LIMIT = 10;

function makeSeed(): number {
    return Math.floor(Math.random() * 2_000_000_000);
}

export function DiscoverPage({
    onDailyRefresh,
}: {
    onDailyRefresh: () => Promise<void>;
}) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
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
                setError(t('feed.errorLoad'));
            }
        },
        [t],
    );

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFirstPage]);

    const reshuffle = useCallback(async () => {
        const yeni = makeSeed();
        setSeed(yeni);
        await loadFirstPage(yeni);
    }, [loadFirstPage]);

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
                seed,
            });
            setItems((prev) => {
                const seen = new Set(prev.map((it) => it.id));
                const yeniler = res.items.filter((it) => !seen.has(it.id));
                return [...prev, ...yeniler];
            });
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch {
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
        // HATA DÜZELTİLDİ: actionLabel eklendi
        return <ErrorState message={error} onAction={onRefresh} actionLabel={t('common.retry')} />;
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
                // tintColor iOS, colors/progressBackgroundColor Android.
                // Android'siz birakilirsa koyu modda spinner koyu zeminde kayboluyor.
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                    progressBackgroundColor={colors.surface}
                />
            }
            ListFooterComponent={
                loadingMore ? (
                    <View style={styles.footer}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : !hasMore && items.length > 0 ? (
                    <Pressable style={styles.reshuffleBtn} onPress={reshuffle}>
                        <Ionicons name="shuffle" size={20} color={colors.primary} />
                        <Text style={styles.reshuffleText}>{t('feed.reshuffle')}</Text>
                    </Pressable>
                ) : null
            }
            ListEmptyComponent={
                <EmptyState icon="compass-outline" message={t('feed.emptyDiscover')} />
            }
        />
    );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: c.background,
    },
    listContent: {
        padding: spacing.md,
        backgroundColor: c.background,
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
        color: c.primary,
    },
});