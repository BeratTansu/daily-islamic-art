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
// lightColors DOGRUDAN: bu ekran bir TEMA degil bir SAHNE — kalici koyu
// (#0F0F0F + bulanik gorsel + siyah gradient), sistem temasindan bagimsiz.
// useTheme kullanilsaydi koyu modda primary/accent acilir, marka tonu bozulurdu.
import { lightColors as colors, spacing, fontFamily } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function Welcome() {
    const { t } = useTranslation();
    const [daily, setDaily] = useState<ArtworkDetail | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let active = true;
        artworkService
            .getDaily()
            .then((d) => {
                if (active) setDaily(d);
            })
            .catch(() => {
            });
        return () => {
            active = false;
        };
    }, []);

    const imageUri = daily?.thumbUrl ?? daily?.imageUrl ?? null;

    return (
        <View style={styles.container}>
            {imageUri && (
                <Image
                    source={{ uri: imageUri }}
                    style={StyleSheet.absoluteFill}
                    blurRadius={6}
                    resizeMode="cover"
                />
            )}

            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            <View
                style={[
                    styles.content,
                    { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
                ]}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerMark}>✦</Text>
                        <View style={styles.dividerLine} />
                    </View>
                    <Text style={styles.subtitle}>
                        {t('auth.welcomeSubtitle')}
                    </Text>
                </View>

                {daily && (
                    <View style={styles.artworkLabel}>
                        {/* Türkçe uppercase tuzağından kaçınmak için uppercase JSON'dan gelmeli */}
                        <Text style={styles.artworkLabelKicker}>{t('feed.dailyArtworkUpper')}</Text>
                        <Text style={styles.artworkLabelArtist}>{daily.artist.name}</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/register')}
                    >
                        <Text style={styles.primaryButtonText}>{t('auth.registerSubmit')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.secondaryButtonText}>{t('auth.loginSubmit')}</Text>
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
        fontSize: 40,
        fontFamily: fontFamily.serif,
        color: '#fff',
        letterSpacing: 2,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        maxWidth: 240,
        marginTop: spacing.xs,
    },
    dividerLine: {
        flex: 1,
        height: 1.5,
        backgroundColor: colors.accent,
    },
    dividerMark: {
        color: colors.accent,
        fontSize: 18,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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