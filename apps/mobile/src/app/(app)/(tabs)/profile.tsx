import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../../context/AuthContext';
import { AuthService, type AuthUser } from '../../../lib/auth/authService';
import { artworkService } from '../../../lib/artworks/artworkService';
import { collectionService } from '../../../lib/collections/collectionService';
import { colors, spacing, fontSize, fontWeight, fontFamily } from '../../../constants/theme';

export default function Profile() {
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();

    const [user, setUser] = useState<AuthUser | null>(null);
    const [likeCount, setLikeCount] = useState<number | null>(null);
    const [collectionCount, setCollectionCount] = useState<number | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                try {
                    // Üçü paralel: kullanıcı bilgisi + beğeni sayısı + koleksiyon sayısı.
                    const [me, liked, collections] = await Promise.all([
                        AuthService.me(),
                        artworkService.listLiked({ limit: 1 }),
                        collectionService.list(),
                    ]);
                    if (!active) return;
                    setUser(me);
                    setLikeCount(liked.meta.total);
                    setCollectionCount(collections.length);
                } catch {
                    /* bilgi gelmezse ekran yine çalışır, çıkış butonu erişilebilir kalır */
                }
            })();
            return () => {
                active = false;
            };
        }, []),
    );

    async function handleSignOut() {
        if (signingOut) return;
        setSigningOut(true);
        try {
            await signOut(); // guard reaktif olarak welcome'a atar
        } catch {
            setSigningOut(false); // başarısızsa butonu geri aç
        }
    }

    const initial = user?.displayName?.trim()?.charAt(0)?.toUpperCase() ?? '?';
    const version = Constants.expoConfig?.version ?? '1.0.0';

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
            {/* Sağ üst — ayarlar dişlisi (header çubuğu yok, serbest ikon) */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => router.push('/settings')}
                    hitSlop={8}
                    accessibilityLabel={t('profile.settings')}
                >
                    <Ionicons name="settings-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.top}>
                {/* Avatar — baş harf */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>

                {/* Ad + email */}
                {user ? (
                    <>
                        <Text style={styles.name}>{user.displayName}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                    </>
                ) : (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
                )}

                {/* İstatistik */}
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {likeCount ?? '—'}
                        </Text>
                        <Text style={styles.statLabel}>{t('profile.likes')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {collectionCount ?? '—'}
                        </Text>
                        <Text style={styles.statLabel}>{t('profile.collections')}</Text>
                    </View>
                </View>
            </View>

            {/* Alt: çıkış + versiyon */}
            <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
                <TouchableOpacity
                    style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
                    onPress={handleSignOut}
                    disabled={signingOut}
                >
                    {signingOut ? (
                        <ActivityIndicator color={colors.danger} />
                    ) : (
                        <Text style={styles.signOutText}>Çıkış Yap</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.version}>v{version}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
    },
    topBar: {
        alignItems: 'flex-end',
        marginBottom: spacing.md,
    },
    top: {
        alignItems: 'center',
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#fff',
    },
    name: {
        fontSize: 28,
        fontFamily: fontFamily.serif,
        letterSpacing: 0.5,
        color: colors.text,
    },
    email: {
        fontSize: fontSize.body,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
        gap: spacing.lg,
    },
    statItem: {
        alignItems: 'center',
        minWidth: 80,
    },
    statNumber: {
        fontSize: fontSize.title,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    statLabel: {
        fontSize: fontSize.caption,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: colors.border,
    },
    bottom: {
        gap: spacing.md,
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    signOutText: {
        color: colors.danger,
        fontSize: fontSize.heading,
        fontWeight: fontWeight.semibold,
    },
    version: {
        textAlign: 'center',
        fontSize: fontSize.caption,
        color: colors.textMuted,
    },
});