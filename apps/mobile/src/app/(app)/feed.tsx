import { useCallback, useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import {
    artworkService,
    ArtworkListItem,
    ArtworkDetail,
} from '../../lib/artworks/artworkService';
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

    // --- Çıkış Yap Fonksiyonu ---
    const handleLogout = useCallback(async () => {
        try {
            // EĞER VARSA: token'ı silen authService fonksiyonunu buraya ekle.
            // Örn: await authService.logout();

            // Kullanıcıyı auth ekranına geri gönderiyoruz
            router.replace('/login'); // Buradaki yolu kendi klasör yapına göre güncelleyebilirsin
        } catch (e) {
            console.error('Çıkış yapılırken hata oluştu:', e);
        }
    }, []);

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

    // Header bileşenini dinamik olarak basıyoruz ki Çıkış butonu her durumda en üstte gözüksün
    const renderHeader = () => (
        <View>
            {/* Üst Bar: Başlık ve Çıkış Butonu */}
            <View style={styles.headerRow}>
                <Text style={styles.dailyLabel}>Günün Eseri</Text>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </Pressable>
            </View>

            {/* Günün Eseri Kartı */}
            {daily && <DailyCard daily={daily} onPress={goToDetail} />}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => <ArtworkCard item={item} onPress={goToDetail} />}
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

// --- Günün eseri kartı (feed üstü) ---
function DailyCard({ daily, onPress }: { daily: ArtworkDetail; onPress: (slug: string) => void }) {
    return (
        <View style={styles.dailyWrap}>
            <Pressable style={styles.dailyCard} onPress={() => onPress(daily.slug)}>
                <Image
                    source={{ uri: daily.thumbUrl ?? daily.imageUrl }}
                    style={styles.dailyImage}
                    resizeMode="cover"
                />
                <View style={styles.dailyMeta}>
                    <Text style={styles.cardArtist} numberOfLines={1}>
                        {daily.artist.name}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}

// --- Feed kartı ---
function ArtworkCard({ item, onPress }: { item: ArtworkListItem; onPress: (slug: string) => void }) {
    return (
        <Pressable style={styles.card} onPress={() => onPress(item.slug)}>
            <Image
                source={{ uri: item.thumbUrl ?? item.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
            />
            <View style={styles.cardMeta}>
                <Text style={styles.cardArtist} numberOfLines={1}>
                    {item.artist.name}
                </Text>
            </View>
        </Pressable>
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
    // Header Row & Logout Button
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    logoutBtn: {
        backgroundColor: colors.danger || '#ef4444',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
    },
    logoutText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
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
    dailyMeta: {
        padding: spacing.md,
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
    cardMeta: {
        padding: spacing.md,
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
        color: colors.danger || '#ef4444',
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