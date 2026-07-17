import { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

type CreateCollectionModalProps = {
    visible: boolean;
    onClose: () => void;
    // İsmi verir, oluşturma+sonrası çağırana ait. Promise döndürür ki
    // modal submit sırasında loading gösterip başarıda kendini kapatabilsin.
    onCreate: (name: string) => Promise<void>;
};

export function CreateCollectionModal({ visible, onClose, onCreate }: CreateCollectionModalProps) {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const trimmed = name.trim();
    const canSubmit = trimmed.length > 0 && !submitting;

    async function handleCreate() {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            await onCreate(trimmed);
            // Başarı: temizle + kapat. Çağıran listeyi zaten yeniledi.
            setName('');
            onClose();
        } catch {
            setError('Koleksiyon oluşturulamadı.');
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        if (submitting) return; // yazma sürerken kapatma
        setName('');
        setError(null);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose} // Android geri tuşu
        >
            {/* Arka plan karartma — dışarı dokununca kapanır */}
            <Pressable style={styles.backdrop} onPress={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.centerWrap}
                >
                    {/* İç kutuya dokunma backdrop'a geçmesin */}
                    <Pressable style={styles.card} onPress={() => {}}>
                        <Text style={styles.title}>Yeni koleksiyon</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Koleksiyon adı"
                            placeholderTextColor={colors.textMuted}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            maxLength={60}
                            editable={!submitting}
                            returnKeyType="done"
                            onSubmitEditing={handleCreate}
                        />

                        {error && <Text style={styles.error}>{error}</Text>}

                        <View style={styles.actions}>
                            <Pressable
                                style={styles.cancelBtn}
                                onPress={handleClose}
                                disabled={submitting}
                            >
                                <Text style={styles.cancelText}>İptal</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
                                onPress={handleCreate}
                                disabled={!canSubmit}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color={colors.background} />
                                ) : (
                                    <Text style={styles.createText}>Oluştur</Text>
                                )}
                            </Pressable>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    centerWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: fontSize.subheading,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.heading,
        color: colors.text,
        backgroundColor: colors.background,
    },
    error: {
        color: colors.danger,
        fontSize: fontSize.caption,
        marginTop: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    cancelBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    cancelText: {
        color: colors.textMuted,
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
    },
    createBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        minWidth: 90,
        alignItems: 'center',
    },
    createBtnDisabled: {
        opacity: 0.5,
    },
    createText: {
        color: colors.background,
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
    },
});