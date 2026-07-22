import { useCallback, useEffect, useState } from 'react';
import {
    View,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { router } from 'expo-router';
import {
    artworkService,
    ArtworkListItem,
    ArtworkSort,
} from '../lib/artworks/artworkService';
import { useLike } from '../lib/artworks/useLike';
import { useLikeContext } from '../context/LikeContext';
import { colors, spacing } from '../constants/theme';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ArtworkCard } from './ArtworkCard';
import { useTranslation } from 'react-i18next';

const PAGE_LIMIT = 10;

export function FeedPage({
    sort,
    onDailyRefresh,
}: {
    sort: ArtworkSort;
    onDailyRefresh: () => Promise<void>;
}) {
    const { t } = useTranslation();
    const [items, setItems] = useState<ArtworkListItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { toggle, likeOnly } = useLike();
    const { getIsLiked, clear: clearLikeOverrides } = useLikeContext();

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
            setError(t('feed.errorLoad'));
        }
    }, [sort, t]);

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
                <EmptyState icon="image-outline" message={t('feed.emptyList')} />
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
});