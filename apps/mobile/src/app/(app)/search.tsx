import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { ArtworkGrid } from '../../components/ArtworkGrid';
import { artworkService } from '../../lib/artworks/artworkService';
import type { ArtworkListItem } from '../../lib/artworks/artworkService';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { colors, spacing } from '../../constants/theme';
import { useNavigationGuard } from '../../lib/hooks/useNavigationGuard';

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ArtworkListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const guardNavigate = useNavigationGuard();

    const debouncedQuery = useDebounce(query, 350);
    const trimmed = debouncedQuery.trim();

    useEffect(() => {
        // Boş sorgu → istek atma (boş q backend'de feed'e düşer, REFERANS tuzağı).
        if (trimmed === '') {
            setResults([]);
            setLoading(false);
            return;
        }

        let active = true; // race guard: geç dönen eski istek yeni sonucu ezmesin
        setLoading(true);

        artworkService
            .list({ q: trimmed, limit: 20 })
            .then((res) => {
                if (!active) return;
                setResults(res.items);
            })
            .catch(() => {
                if (!active) return;
                setResults([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [trimmed]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Arama başlığı: geri + input */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <View style={styles.inputWrap}>
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                    <TextInput
                        style={styles.input}
                        placeholder="Sanatçı ara"
                        placeholderTextColor={colors.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => setQuery('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Durumlar: yükleniyor / başlangıç / boş sonuç / sonuç */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : trimmed === '' ? (
                <View style={styles.center}>
                    <Text style={styles.hint}>Sanatçı adıyla arama yap</Text>
                </View>
            ) : results.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.hint}>"{trimmed}" için sonuç bulunamadı</Text>
                </View>
            ) : (
                <ArtworkGrid
                    data={results}
                    onPressItem={(slug) =>
                        guardNavigate(() =>
                            router.push({ pathname: '/artwork/[slug]', params: { slug } })
                        )
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        padding: spacing.xs,
    },
    inputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        height: 44,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    hint: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
    },
});