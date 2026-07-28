import { useCallback, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useFocusEffect, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    artworkService,
    ArtworkListItem,
} from '../../../lib/artworks/artworkService';
import { ArtworkGrid } from '../../../components/ArtworkGrid';
import { spacing, type ThemeColors } from '../../../constants/theme';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { useNavigationGuard } from '../../../lib/hooks/useNavigationGuard';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useTranslation } from 'react-i18next';

const PAGE_LIMIT = 30;

export default function LikedScreen() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const guardNavigate = useNavigationGuard();
    const [items, setItems] = useState<ArtworkListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFirstPage = useCallback(async () => {
        setError(null);
        try {
            const res = await artworkService.listLiked({ page: 1, limit: PAGE_LIMIT });
            setItems(res.items);
            setTotal(res.meta.total);
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch {
            setError(t('collections.errorLoadLiked'));
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                await loadFirstPage();
                if (active) setLoading(false);
            })();
            return () => {
                active = false;
            };
        }, [loadFirstPage]),
    );

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await artworkService.listLiked({ page: next, limit: PAGE_LIMIT });
            setItems((prev) => [...prev, ...res.items]);
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch {
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, loading, page]);

    const goToArtwork = useCallback((slug: string) => {
        guardNavigate(() => router.push({ pathname: '/artwork/[slug]', params: { slug } }));
    }, [guardNavigate]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error && items.length === 0) {
        // HATA DÜZELTİLDİ: actionLabel eklendi
        return <ErrorState message={error} onAction={loadFirstPage} actionLabel={t('common.retry')} />;
    }

    const header = (
        <View style={styles.header}>
            <Text style={styles.title}>{t('collections.liked')}</Text>
            {/* HATA DÜZELTİLDİ: t() fonksiyon parametre sırası düzeltildi */}
            <Text style={styles.count}>{t('collections.itemCount', { count: total })}</Text>
        </View>
    );

    const empty = (
        <EmptyState
            icon="heart-outline"
            message={t('collections.emptyLiked')}
            actionLabel={t('collections.exploreAction')}
            onAction={() => router.push('/(app)/(tabs)/feed')}
        />
    );

    const footer = loadingMore ? (
        <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
        </View>
    ) : null;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: '',
                    headerTintColor: colors.text,
                    headerStyle: { backgroundColor: colors.background },
                }}
            />

            <ArtworkGrid
                data={items}
                onPressItem={goToArtwork}
                ListHeaderComponent={header}
                ListEmptyComponent={empty}
                onEndReached={loadMore}
                ListFooterComponent={footer}
            />
        </View>
    );
}

// Modul seviyesinde: component icine alinirsa her render'da yeni referans olur.
// Olu stiller (emptyWrap/emptyText/errorText/retryBtn/retryText) SILINDI —
// EmptyState/ErrorState component'lerine gecilmis, bunlar kullanilmiyordu.
const makeStyles = (c: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: c.background,
        },
        centered: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
            backgroundColor: c.background,
        },
        header: {
            paddingBottom: spacing.md,
        },
        title: {
            fontSize: 24,
            fontWeight: '700',
            color: c.text,
        },
        count: {
            fontSize: 14,
            color: c.textMuted,
            marginTop: 4,
        },
        footer: {
            paddingVertical: spacing.lg,
        },
    });