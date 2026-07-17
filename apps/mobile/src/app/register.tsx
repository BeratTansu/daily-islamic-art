import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../constants/theme';
import { router } from 'expo-router';

export default function Register() {
    const { register } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (submitting) return;
        setError(null);

        // Client-side validasyon = backend RegisterDto kurallarının aynası (UX kolaylığı).
        // Backend hâlâ tek gerçek kaynak; bu sadece kullanıcıyı erken uyarır.
        // KURAL SENKRONU: backend register.dto.ts değişirse burası da güncellenmeli.
        const name = displayName.trim();
        const mail = email.trim();

        if (!name || !mail || !password) {
            setError('Tüm alanları doldur.');
            return;
        }
        if (name.length < 2) {
            setError('Ad en az 2 karakter olmalı.');
            return;
        }
        if (password.length < 8) {
            setError('Şifre en az 8 karakter olmalı.');
            return;
        }

        setSubmitting(true);
        try {
            await register(mail, password, name);
            router.replace('/feed'); // kayıt = otomatik giriş; imperatif yönlendir
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Kayıt başarısız. Tekrar dene.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.form}>
                <Text style={styles.title}>Hesap Oluştur</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Ad"
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!submitting}
                />

                <TextInput
                    style={styles.input}
                    placeholder="E-posta"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!submitting}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Şifre"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    editable={!submitting}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                    style={[styles.button, submitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Kayıt Ol</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/login')}
                    disabled={submitting}
                    style={styles.linkWrapper}
                >
                    <Text style={styles.link}>Zaten hesabın var mı? Giriş yap</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
    },
    form: { gap: spacing.md },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.surface,
    },
    error: { color: colors.danger, fontSize: 14 },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    linkWrapper: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    link: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});