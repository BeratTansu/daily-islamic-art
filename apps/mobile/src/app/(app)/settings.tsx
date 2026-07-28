import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ActionSheet, type ActionSheetItem } from '../../components/ActionSheet';
import { setLocale, type SupportedLocale } from '../../i18n';
import { spacing, fontSize, type ThemeColors } from '../../constants/theme';
import { useTheme, useThemedStyles, type ThemeMode } from '../../context/ThemeContext';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    // colors = inline kullanımlar için (Ionicons rengi gibi)
    // styles = tema-duyarlı StyleSheet (factory modül seviyesinde, aşağıda)
    // mode = kullanicinin SECIMI (satirda gosterilen), setMode = tek kapi
    const { colors, mode, setMode } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [langSheetOpen, setLangSheetOpen] = useState(false);
    const [themeSheetOpen, setThemeSheetOpen] = useState(false);

    // Aktif dile göre gösterilecek isim (satırda sağda "Türkçe"/"English" yazsın)
    const currentLangLabel =
        i18n.language === 'en' ? t('settings.languageEn') : t('settings.languageTr');

    async function pickLocale(locale: SupportedLocale) {
        setLangSheetOpen(false);
        // setLocale: changeLanguage + AsyncStorage'a kalıcı kaydet (tek kapı).
        // Zaten seçili dile basılırsa da zararsız (idempotent).
        await setLocale(locale);
    }

    // Dil seçim sheet'i — mevcut ActionSheet ile (TR / EN).
    const langItems: ActionSheetItem[] = [
        {
            icon: 'language-outline',
            label: t('settings.languageTr'),
            onPress: () => pickLocale('tr'),
        },
        {
            icon: 'language-outline',
            label: t('settings.languageEn'),
            onPress: () => pickLocale('en'),
        },
    ];

    // Satirda saginda gosterilen: SECIM (uygulanan sema degil).
    // 'Sistem' secikken cihaz koyuysa bile 'Sistem' yazar — secim neyse o.
    const currentThemeLabel =
        mode === 'light'
            ? t('settings.themeLight')
            : mode === 'dark'
                ? t('settings.themeDark')
                : t('settings.themeSystem');

    async function pickTheme(next: ThemeMode) {
        setThemeSheetOpen(false);
        // setMode: state + AsyncStorage persist (setLocale ile ayni felsefe).
        await setMode(next);
    }

    const themeItems: ActionSheetItem[] = [
        {
            icon: 'phone-portrait-outline',
            label: t('settings.themeSystem'),
            onPress: () => pickTheme('system'),
        },
        {
            icon: 'sunny-outline',
            label: t('settings.themeLight'),
            onPress: () => pickTheme('light'),
        },
        {
            icon: 'moon-outline',
            label: t('settings.themeDark'),
            onPress: () => pickTheme('dark'),
        },
    ];

    function showAbout() {
        Alert.alert(t('settings.about'), t('settings.aboutBody'));
    }

    return (
        <View style={styles.container}>
            {/* Header — geri butonu için headerShown, kök _layout'u override eder */}
            <Stack.Screen options={{ headerShown: true, title: t('settings.title') }} />

            <ScrollView
                contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
            >
                {/* Dil satırı — sağda aktif dil, basınca sheet */}
                <TouchableOpacity style={styles.row} onPress={() => setLangSheetOpen(true)}>
                    <View style={styles.rowLeft}>
                        <Ionicons name="language-outline" size={22} color={colors.text} />
                        <Text style={styles.rowLabel}>{t('settings.language')}</Text>
                    </View>
                    <View style={styles.rowRight}>
                        <Text style={styles.rowValue}>{currentLangLabel}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                </TouchableOpacity>

                {/* Tema satırı — dil satırıyla birebir aynı desen */}
                <TouchableOpacity style={styles.row} onPress={() => setThemeSheetOpen(true)}>
                    <View style={styles.rowLeft}>
                        <Ionicons name="contrast-outline" size={22} color={colors.text} />
                        <Text style={styles.rowLabel}>{t('settings.theme')}</Text>
                    </View>
                    <View style={styles.rowRight}>
                        <Text style={styles.rowValue}>{currentThemeLabel}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                </TouchableOpacity>

                {/* Hakkında satırı — basınca Alert */}
                <TouchableOpacity style={styles.row} onPress={showAbout}>
                    <View style={styles.rowLeft}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.text} />
                        <Text style={styles.rowLabel}>{t('settings.about')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
            </ScrollView>

            <ActionSheet
                visible={langSheetOpen}
                onClose={() => setLangSheetOpen(false)}
                items={langItems}
            />

            <ActionSheet
                visible={themeSheetOpen}
                onClose={() => setThemeSheetOpen(false)}
                items={themeItems}
            />
        </View>
    );
}

// MODÜL SEVİYESİNDE tanımlı olmak ZORUNDA: component içine alınırsa
// her render'da yeni fonksiyon referansı olur, useMemo hiç tutmaz.
const makeStyles = (c: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: c.background,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        rowLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
        },
        rowRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
        },
        rowLabel: {
            fontSize: fontSize.heading,
            color: c.text,
        },
        rowValue: {
            fontSize: fontSize.body,
            color: c.textMuted,
        },
    });