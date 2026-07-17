import { useCallback, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    collectionService,
    CollectionDetail,
} from '../../../lib/collections/collectionService';
import { ArtworkGrid } from '../../../components/ArtworkGrid';
import { colors, spacing } from '../../../constants/theme';
import { useNavigationGuard } from '../../../lib/hooks/useNavigationGuard';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';

export default function CollectionDetailScreen() {
    const guardNavigate = useNavigationGuard();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [collection, setCollection] = useState<CollectionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            const data = await collectionService.getOne(id);
            setCollection(data);
        } catch {
            setError('Koleksiyon yüklenemedi.');
        }
    }, [id]);

    // Odaklanınca tazele: detaydan çıkıp (eser eklenmiş olabilir) geri gelince güncel.
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

    const goToArtwork = useCallback((slug: string) => {
        guardNavigate(() => router.push({ pathname: '/artwork/[slug]', params: { slug } }));
    }, [guardNavigate]);

    // Silme: görünür buton → onay → sil → listeye geri dön.
    // Alert.alert iki platformda da çalışır (Alert.prompt'un aksine).
    const handleDelete = useCallback(() => {
        Alert.alert(
            'Koleksiyonu sil',
            'Bu koleksiyon silinecek. Eserlerin kendisi silinmez.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await collectionService.remove(id);
                            router.back(); // listeye dön, useFocusEffect orada tazeler
                        } catch {
                            setDeleting(false);
                            Alert.alert('Hata', 'Koleksiyon silinemedi.');
                        }
                    },
                },
            ],
        );
    }, [id]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error || !collection) {
        return (
            <ErrorState
                message={error ?? 'Koleksiyon bulunamadı.'}
                actionLabel="Geri dön"
                onAction={() => router.back()}
            />
        );
    }

    const header = (
        <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
                {collection.name}
            </Text>
            <Text style={styles.count}>{collection.items.length} eser</Text>
        </View>
    );

    const empty = (
        <EmptyState icon="images-outline" message="Bu koleksiyon henüz boş." />
    );

    return (
        <View style={styles.container}>
            {/* Stack header'ına sağ üst "Sil" butonu. headerShown burada true —
                (app) Stack'i normalde false, bu ekran override eder. */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: '',
                    headerTintColor: colors.text,
                    headerStyle: { backgroundColor: colors.background },
                    headerRight: () =>
                        deleting ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                            <Pressable onPress={handleDelete} hitSlop={8}>
                                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                            </Pressable>
                        ),
                }}
            />

            <ArtworkGrid
                data={collection.items}
                onPressItem={goToArtwork}
                ListHeaderComponent={header}
                ListEmptyComponent={empty}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    count: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 4,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.xl,
        gap: spacing.sm,
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