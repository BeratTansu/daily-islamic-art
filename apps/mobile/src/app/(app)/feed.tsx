import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import {
    artworkService,
    ArtworkListItem,
    ArtworkDetail,
} from '../../lib/artworks/artworkService';
import { useLike } from '../../lib/artworks/useLike';
import { LikeButton } from '../../components/LikeButton';
import { colors, spacing } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_LIMIT = 10;

export default function FeedScreen() {
    const [items, setItems] = useState<ArtworkListItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true); // ilk yükleme
    const [loadingMore, setLoadingMore] = useState(false); // alt sayfa
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [daily, setDaily] = useState<ArtworkDetail | null>(null);

    // --- Feed ilk sayfa / yenileme ---
    const loadFirstPage = useCallback(async () => {
        setError(null);
        try {
            const res = await artworkService.list({ page: 1, limit: PAGE_LIMIT });
            setItems(res.items);
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch (e) {
            setError('Eserler yüklenemedi.');
        }
    }, []);

    const loadDaily = useCallback(async () => {
        try {
            const d = await artworkService.getDaily();
            setDaily(d);
        } catch {
            setDaily(null); // daily hata verirse feed çalışmaya devam etsin
        }
    }, []);

    // Açılış
    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            await Promise.all([loadFirstPage(), loadDaily()]);
            if (active) setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [loadFirstPage, loadDaily]);

    // Pull-to-refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadFirstPage(), loadDaily()]);
        setRefreshing(false);
    }, [loadFirstPage, loadDaily]);

    // Sonsuz kaydırma — çift-fetch guard'lı
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const res = await artworkService.list({ page: next, limit: PAGE_LIMIT });
            setItems((prev) => [...prev, ...res.items]);
            setPage(res.meta.page);
            setHasMore(res.meta.page < res.meta.pages);
        } catch {
            // alt sayfa hatası sessiz — üstteki liste durur, retry pull ile
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, loading, page]);

    const goToDetail = useCallback((slug: string) => {
        router.push({ pathname: '/artwork/[slug]', params: { slug } });
    }, []);

    // Optimistic state güncelleyici. Aynı eser hem listede hem daily kartında
    // olabilir → ikisini de günceller, yoksa iki kalp ayrışır.
    const applyLocal = useCallback((id: string, isLiked: boolean) => {
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, isLiked } : a)));
        setDaily((prev) => (prev && prev.id === id ? { ...prev, isLiked } : prev));
    }, []);

    const { toggle, likeOnly } = useLike(applyLocal);

    // Hook'lar erken return'lerin ÜSTÜNDE olmalı (Rules of Hooks).
    // Aşağıdaki `if (loading) return` bu useCallback'i atlarsa hook sırası bozulur.
    const renderItem = useCallback(
        ({ item }: { item: ArtworkListItem }) => (
            <ArtworkCard
                item={item}
                onPress={goToDetail}
                onToggleLike={toggle}
                onDoubleTapLike={likeOnly}
            />
        ),
        [goToDetail, toggle, likeOnly],
    );

    // --- İlk yükleme spinner ---
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // --- İlk yükleme hatası (feed boş + hata) ---
    if (error && items.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryBtn} onPress={onRefresh}>
                    <Text style={styles.retryText}>Tekrar dene</Text>
                </Pressable>
            </View>
        );
    }



    const renderHeader = () => (
        <View>
            <Text style={styles.dailyLabel}>Günün Eseri</Text>
            {daily && (
                <DailyCard
                    daily={daily}
                    onPress={goToDetail}
                    onToggleLike={toggle}
                    onDoubleTapLike={likeOnly}
                />
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
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
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>Henüz eser yok.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

// Görsel jesti: çift dokunma → beğen (asla kaldırmaz), tek dokunma → detay.
// Exclusive: önce doubleTap denenir, ~200ms içinde ikinci dokunuş gelmezse singleTap.
// Bedeli: tek dokunuşta ~200ms navigasyon gecikmesi. Gün 17'de hissiyat değerlendirilecek.
//
// runOnJS ŞART: jest callback'leri UI thread'de (worklet) çalışır,
// React state'ine oradan dokunulamaz.
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
            // Varsayılan 500ms → iki dokunuş arası bu kadar beklenir, tek dokunuş
            // o kadar gecikir. 250ms: Instagram'ın hissiyatına yakın.
            // Bedeli: yavaş çift dokunuş "çift" sayılmaz, detay açılır.
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

// --- Günün eseri kartı (feed üstü) ---
function DailyCard({
    daily,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    daily: ArtworkDetail;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    const gesture = useImageGesture(daily.id, daily.slug, daily.isLiked, onPress, onDoubleTapLike);

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

                {/* Meta satırı jest DIŞINDA: gecikmesiz detay + kalp butonu.
                    Kalp GestureDetector içinde olsaydı jest onu yutardı. */}
                <View style={styles.metaRow}>
                    <Pressable style={styles.metaText} onPress={() => onPress(daily.slug)}>
                        <Text style={styles.cardArtist} numberOfLines={1}>
                            {daily.artist.name}
                        </Text>
                    </Pressable>
                    <LikeButton isLiked={daily.isLiked} onPress={() => onToggleLike(daily.id, daily.isLiked)} />
                </View>
            </View>
        </View>
    );
}

// --- Feed kartı ---
function ArtworkCard({
    item,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    item: ArtworkListItem;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    // isLiked opsiyonel (feed cache'i içermez, backend enrich eder).
    // Gelmemişse false varsay — beğenisiz göster, çift dokunma beğenir.
    const isLiked = item.isLiked ?? false;
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
                <LikeButton isLiked={isLiked} onPress={() => onToggleLike(item.id, isLiked)} />
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
    // Daily
    dailyWrap: {
        marginBottom: spacing.lg,
    },
    dailyLabel: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
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
    // Kart
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
    // İki kart da aynı meta satırını kullanıyor: sanatçı adı (esner) + kalp.
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
    cardArtist: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    // Durumlar
    footer: {
        paddingVertical: spacing.lg,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 15,
    },
    errorText: {
        color: colors.danger,
        fontSize: 15,
        marginBottom: spacing.md,
    },
    retryBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    retryText: {
        color: colors.background,
        fontWeight: '600',
    },
});