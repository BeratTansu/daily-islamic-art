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
import { colors, spacing, fontFamily } from '../constants/theme';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const { t } = useTranslation();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            await signIn(email.trim(), password);
            router.replace('/feed');
        } catch (e) {
            setError(e instanceof Error ? e.message : t('auth.loginError'));
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
                <TouchableOpacity
                    onPress={() => router.back()}
                    disabled={submitting}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← {t('common.back')}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>

                <TextInput
                    style={styles.input}
                    placeholder={t('auth.email')}
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
                    placeholder={t('auth.password')}
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
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
                        <Text style={styles.buttonText}>{t('auth.loginSubmit')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/register')}
                    disabled={submitting}
                    style={styles.linkWrapper}
                >
                    <Text style={styles.link}>{t('auth.registerLink')}</Text>
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
        fontSize: 32,
        fontFamily: fontFamily.serif,
        letterSpacing: 1,
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
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
    },
    backButtonText: {
        color: colors.textMuted,
        fontSize: 15,
        fontWeight: '600',
    },
    linkWrapper: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    link: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});