import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'dia.theme.mode';

/**
 * Provider mount edilmeden ÖNCE doldurulur (_layout gate'i).
 * Modül seviyesi değişken çünkü AsyncStorage async; Provider'ın içinde
 * okusaydık ilk frame light basar, sonra koyuya atlardı (flash).
 * i18n'deki applyStoredLocale ile aynı desen.
 */
let initialThemeMode: ThemeMode = 'system';

function isThemeMode(v: unknown): v is ThemeMode {
    return v === 'system' || v === 'light' || v === 'dark';
}

/** Kayıtlı tema tercihini oku. Hata olursa sessizce 'system' kalır. */
export async function applyStoredThemeMode(): Promise<void> {
    try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (isThemeMode(saved)) {
            initialThemeMode = saved;
        }
    } catch {
        // storage okunamadı → 'system' default'u yeterli, kullanıcıyı bloklamaz
    }
}

type ThemeContextValue = {
    /** Kullanıcının SEÇİMİ (Ayarlar'da işaretli olan) */
    mode: ThemeMode;
    /** Ekranda GERÇEKTEN uygulanan şema (mode='system' ise cihazdan türer) */
    scheme: ColorScheme;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(initialThemeMode);

    // useColorScheme reaktif: cihaz teması değişince yeniden render olur.
    // Dönüş tipi 'light' | 'dark' dışında null/undefined/'unspecified' de
    // olabiliyor → `??` yetmez (o sadece null/undefined yakalar).
    // Açık daraltma: SADECE 'dark' koyudur, kalan her şey light.
    // Bilinmeyen değeri sessizce koyuya düşürmemek bilinçli (light = güvenli default).
    const systemScheme = useColorScheme();

    const scheme: ColorScheme =
        mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    const colors = scheme === 'dark' ? darkColors : lightColors;

    /** Tek kapı: state + kalıcı kayıt birlikte (setLocale ile aynı felsefe). */
    const setMode = useCallback(async (next: ThemeMode) => {
        setModeState(next);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, next);
        } catch {
            // kalıcılık başarısız olsa da oturum içi tema çalışır
        }
    }, []);

    const value = useMemo<ThemeContextValue>(
        () => ({ mode, scheme, colors, setMode }),
        [mode, scheme, colors, setMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme, ThemeProvider içinde kullanılmalı');
    }
    return ctx;
}

/**
 * Tema-duyarlı StyleSheet.
 *
 * StyleSheet.create modül seviyesinde renk DEĞERLERİNİ yakalar ve döndüğü
 * objeyi dev'de dondurur → runtime tema değişimi için stil, renk girdisiyle
 * yeniden üretilmeli.
 *
 * KURAL: factory MODÜL SEVİYESİNDE tanımlanmalı (component içinde değil),
 * yoksa her render'da yeni referans → useMemo hiç tutmaz.
 */
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
    const { colors } = useTheme();
    return useMemo(() => factory(colors), [factory, colors]);
}

/**
 * Native header/ekran renkleri — TEK KAYNAK.
 *
 * İki Stack var (kök `_layout` + `(app)/_layout`) ve `headerShown: true`
 * yapan ekranlar (settings, artwork detay) hangisinin altındaysa onun
 * option'larını miras alır. İkisine birden verilmezse header tema değişimini
 * kaçırır (koyu ekranın üstünde beyaz şerit).
 */
export function useThemedScreenOptions() {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      headerShown: false,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text },
      // Ekranlar arasi gecerken beyaz flash olmasin
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors],
  );
}