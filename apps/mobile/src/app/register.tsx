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
import { spacing, fontFamily, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function Register() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { register } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (submitting) return;
        setError(null);

        const name = displayName.trim();
        const mail = email.trim();

        if (!name || !mail || !password) {
            setError(t('auth.valAllFields'));
            return;
        }
        if (name.length < 2) {
            setError(t('auth.valNameMin'));
            return;
        }
        if (password.length < 8) {
            setError(t('auth.valPasswordMin'));
            return;
        }

        setSubmitting(true);
        try {
            await register(mail, password, name);
            router.replace('/feed');
        } catch (e) {
            setError(e instanceof Error ? e.message : t('auth.registerError'));
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

                <Text style={styles.title}>{t('auth.registerTitle')}</Text>

                <TextInput
                    style={styles.input}
                    placeholder={t('auth.name')}
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!submitting}
                />

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
                        // '#fff' hardcode idi: buton zemini primary → onPrimary sozlesmesi
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <Text style={styles.buttonText}>{t('auth.registerSubmit')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.replace('/login')}
                    disabled={submitting}
                    style={styles.linkWrapper}
                >
                    <Text style={styles.link}>{t('auth.loginLink')}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (c: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            backgroundColor: c.background,
            paddingHorizontal: spacing.lg,
        },
        form: { gap: spacing.md },
        title: {
            fontSize: 32,
            fontFamily: fontFamily.serif,
            letterSpacing: 1,
            color: c.text,
            textAlign: 'center',
            marginBottom: spacing.lg,
        },
        input: {
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 8,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            fontSize: 16,
            color: c.text,
            backgroundColor: c.surface,
        },
        error: { color: c.danger, fontSize: 14 },
        backButton: {
            alignSelf: 'flex-start',
            marginBottom: spacing.sm,
            paddingVertical: spacing.xs,
        },
        backButtonText: {
            color: c.textMuted,
            fontSize: 15,
            fontWeight: '600',
        },
        button: {
            backgroundColor: c.primary,
            borderRadius: 8,
            paddingVertical: spacing.md,
            alignItems: 'center',
            marginTop: spacing.sm,
        },
        buttonDisabled: { opacity: 0.6 },
        // '#fff' hardcode idi → onPrimary (primary zemini ustundeki metin)
        buttonText: { color: c.onPrimary, fontSize: 16, fontWeight: '600' },
        linkWrapper: {
            alignItems: 'center',
            marginTop: spacing.sm,
        },
        link: {
            color: c.primary,
            fontSize: 14,
            fontWeight: '600',
        },
    });