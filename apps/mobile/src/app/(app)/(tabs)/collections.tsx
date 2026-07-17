import { useCallback, useState } from 'react';
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
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collectionService } from '../../../lib/collections/collectionService';
import { artworkService } from '../../../lib/artworks/artworkService';
import { CreateCollectionModal } from '../../../components/CreateCollectionModal';
import { colors, spacing } from '../../../constants/theme';
import { EmptyState } from '../../../components/EmptyState';


// İki farklı şeyi tek listede göstermek için ortak satır tipi.
// 'liked' = sistem satırı (Beğendiklerim), 'collection' = gerçek koleksiyon.
type CollectionRow = {
    key: string;
    title: string;
    count: number;
    coverUrl: string | null;
    kind: 'liked' | 'collection';
    id?: string; // sadece 'collection' için — 'liked'ın id'si yok (sahte satır değil)
};

export default function CollectionsScreen() {
    const [rows, setRows] = useState<CollectionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // İki kaynağı paralel çek, tek listede birleştir.
    // Beğeni satırı EN BAŞA elle konur — API'ye sahte satır enjekte edilmez.
    const load = useCallback(async () => {
        setError(null);
        try {
            const [collections, liked] = await Promise.all([
                collectionService.list(),
                artworkService.listLiked({ limit: 1 }),
            ]);

            const likedRow: CollectionRow = {
                key: 'liked',
                title: 'Beğendiklerim',
                count: liked.meta.total,
                coverUrl: liked.items[0]
                    ? (liked.items[0].thumbUrl ?? liked.items[0].imageUrl)
                    : null,
                kind: 'liked',
            };

            const collectionRows: CollectionRow[] = collections.map((c) => ({
                key: c.id,
                title: c.name,
                count: c.itemCount,
                coverUrl: c.coverUrl,
                kind: 'collection',
                id: c.id,
            }));

            setRows([likedRow, ...collectionRows]);
        } catch {
            setError('Koleksiyonlar yüklenemedi.');
        }
    }, []);

    // useFocusEffect: ekrana her dönüşte tazele. Koleksiyon detayından geri
    // gelince (eser eklenmiş/çıkmış olabilir) veya kaydet sonrası güncel kalsın.
    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                await load();
                if (active) setLoading(false);
            })();
            return () => {
                active = false;
            };
        }, [load]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleCreate = useCallback(
        async (name: string) => {
            await collectionService.create(name);
            await load(); // yeni koleksiyon listeye girsin
        },
        [load],
    );

    const goToRow = useCallback((row: CollectionRow) => {
        if (row.kind === 'liked') {
            router.push('/collections/liked');
        } else if (row.id) {
            router.push({ pathname: '/collections/[id]', params: { id: row.id } });
        }
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: CollectionRow }) => (
            <Pressable style={styles.row} onPress={() => goToRow(item)}>
                {item.coverUrl ? (
                    <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                    <View style={[styles.cover, styles.coverEmpty]}>
                        <Ionicons
                            name={item.kind === 'liked' ? 'heart-outline' : 'folder-outline'}
                            size={24}
                            color={colors.textMuted}
                        />
                    </View>
                )}
                <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.rowCount}>{item.count} eser</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
        ),
        [goToRow],
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error && rows.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryBtn} onPress={onRefresh}>
                    <Text style={styles.retryText}>Tekrar dene</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Koleksiyonlar</Text>
                <Pressable style={styles.newBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.newBtnText}>Yeni</Text>
                </Pressable>
            </View>

            <FlatList
                data={rows}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListFooterComponent={
                    rows.length === 1 ? (
                        <EmptyState
                            icon="albums-outline"
                            message="Henüz kendi koleksiyonun yok. Keşfet'ten eser ekleyerek başla."
                            actionLabel="Keşfet'e git"
                            onAction={() => router.push('/(app)/(tabs)/feed')}
                            fillScreen={false}
                        />
                    ) : null
                }
            />

            <CreateCollectionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleCreate}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs ?? 4,
    },
    newBtnText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
        flexGrow: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.md,
    },
    cover: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    coverEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    rowCount: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
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