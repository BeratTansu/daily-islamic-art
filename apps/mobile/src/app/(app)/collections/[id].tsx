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
import { spacing, type ThemeColors } from '../../../constants/theme';
import { useTheme, useThemedStyles } from '../../../context/ThemeContext';
import { useNavigationGuard } from '../../../lib/hooks/useNavigationGuard';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { useTranslation } from 'react-i18next';

export default function CollectionDetailScreen() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
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
            setError(t('collections.errorLoad'));
        }
    }, [id, t]);

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

    const handleDelete = useCallback(() => {
        Alert.alert(
            t('collections.deleteTitle'),
            t('collections.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await collectionService.remove(id);
                            router.back();
                        } catch {
                            setDeleting(false);
                            Alert.alert(t('common.error'), t('collections.deleteError'));
                        }
                    },
                },
            ],
        );
    }, [id, t]);

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
                message={error ?? t('collections.notFound')}
                actionLabel={t('common.goBack')}
                onAction={() => router.back()}
            />
        );
    }

    const header = (
        <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
                {collection.name}
            </Text>
            {/* HATA DÜZELTİLDİ: t() fonksiyon parametre sırası düzeltildi */}
            <Text style={styles.count}>{t('collections.itemCount', { count: collection.items.length })}</Text>
        </View>
    );

    const empty = (
        <EmptyState icon="images-outline" message={t('collections.emptyDetail')} />
    );

    return (
        <View style={styles.container}>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        color: c.textMuted,
        fontSize: 15,
    },
    errorText: {
        color: c.danger,
        fontSize: 15,
        marginBottom: spacing.md,
    },
    retryBtn: {
        backgroundColor: c.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    retryText: {
        color: c.onPrimary,
        fontWeight: '600',
    },
});