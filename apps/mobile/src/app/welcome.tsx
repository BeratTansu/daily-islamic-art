import { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { artworkService, type ArtworkDetail } from '../lib/artworks/artworkService';
import { colors, spacing } from '../constants/theme';

export default function Welcome() {
    const [daily, setDaily] = useState<ArtworkDetail | null>(null);
    const insets = useSafeAreaInsets();

    // Görsel dekoratif davet — akışı bloklamaz. Hata sessiz yutulur:
    // görsel gelmezse koyu arka plan kalır, butonlar çalışmaya devam eder.
    useEffect(() => {
        let active = true;
        artworkService
            .getDaily()
            .then((d) => {
                if (active) setDaily(d);
            })
            .catch(() => {
                /* misafir için daily olmasa da olur; ekran patlamaz */
            });
        return () => {
            active = false;
        };
    }, []);

    const imageUri = daily?.thumbUrl ?? daily?.imageUrl ?? null;

    return (
        <View style={styles.container}>
            {/* Katman 1: hafif blurlu görsel, tüm ekran. */}
            {imageUri && (
                <Image
                    source={{ uri: imageUri }}
                    style={StyleSheet.absoluteFill}
                    blurRadius={6}
                    resizeMode="cover"
                />
            )}

            {/* Katman 2: alttan yukarı koyu gradient — okunurluk + derinlik. */}
            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Katman 3: içerik. */}
            <View
                style={[
                    styles.content,
                    { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
                ]}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Daily Islamic Art</Text>
                    <Text style={styles.subtitle}>
                        Her gün yeni bir İslam sanatı eseri keşfet.
                    </Text>
                </View>

                {/* Orta: eser etiketi — sadece daily geldiyse. */}
                {daily && (
                    <View style={styles.artworkLabel}>
                        <Text style={styles.artworkLabelKicker}>BUGÜNÜN ESERİ</Text>
                        <Text style={styles.artworkLabelArtist}>{daily.artist.name}</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/register')}
                    >
                        <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    header: {
        gap: spacing.sm,
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 22,
    },
    artworkLabel: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    artworkLabelKicker: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.7)',
    },
    artworkLabelArtist: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    actions: {
        gap: spacing.md,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});