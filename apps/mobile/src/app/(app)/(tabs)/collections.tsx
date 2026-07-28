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
import { spacing, fontSize, fontWeight, fontFamily, type ThemeColors } from '../../../constants/theme';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useTranslation } from 'react-i18next';

type CollectionRow = {
    key: string;
    title: string;
    count: number;
    coverUrl: string | null;
    kind: 'liked' | 'collection';
    id?: string;
};

export default function CollectionsScreen() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [rows, setRows] = useState<CollectionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            const [collections, liked] = await Promise.all([
                collectionService.list(),
                artworkService.listLiked({ limit: 1 }),
            ]);

            const likedRow: CollectionRow = {
                key: 'liked',
                title: t('collections.liked'),
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
            setError(t('collections.errorLoad'));
        }
    }, [t]);

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
            await load();
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
                    <Text style={styles.rowCount}>{t('collections.itemCount', { count: item.count })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
        ),
        [goToRow, t, styles, colors],
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
                {/* HATA DÜZELTİLDİ: actionLabel eklendi */}
                <ErrorState message={error} onAction={onRefresh} actionLabel={t('common.retry')} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('collections.title')}</Text>
                <Pressable style={styles.newBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.newBtnText}>{t('collections.new')}</Text>
                </Pressable>
            </View>

            <FlatList
                data={rows}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                        progressBackgroundColor={colors.surface}
                    />
                }
                ListFooterComponent={
                    rows.length === 1 ? (
                        <EmptyState
                            icon="albums-outline"
                            message={t('collections.emptyMessage')}
                            actionLabel={t('collections.exploreAction')}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    safe: {
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: fontFamily.serif,
        letterSpacing: 0.5,
        color: c.text,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs ?? 4,
    },
    newBtnText: {
        color: c.primary,
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
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
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
    },
    coverEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
    },
    rowTitle: {
        fontSize: fontSize.heading,
        fontWeight: fontWeight.semibold,
        color: c.text,
    },
    rowCount: {
        fontSize: fontSize.caption,
        color: c.textMuted,
        marginTop: 2,
    },
});