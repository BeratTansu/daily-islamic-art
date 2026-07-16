import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { colors, spacing } from '../../../constants/theme';

export default function Profile() {
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();

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
        <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
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
                        <Text style={styles.statLabel}>Beğeni</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {collectionCount ?? '—'}
                        </Text>
                        <Text style={styles.statLabel}>Koleksiyon</Text>
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
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    email: {
        fontSize: 15,
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
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 13,
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
        fontSize: 16,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        fontSize: 13,
        color: colors.textMuted,
    },
});