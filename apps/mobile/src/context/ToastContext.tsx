import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';

type ToastType = 'success' | 'error';

type ToastState = {
    message: string;
    type: ToastType;
} | null;

type ToastContextValue = {
    showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastState>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback(
        (message: string, type: ToastType = 'error') => {
            // Yeni toast eskisini ezer: varsa önceki timer'ı temizle.
            if (hideTimer.current) clearTimeout(hideTimer.current);

            setToast({ message, type });

            // Belir: fade + slide in.
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // VISIBLE_MS sonra kaybol.
            hideTimer.current = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: -20,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => setToast(null));
            }, VISIBLE_MS);
        },
        [opacity, translateY],
    );

    // Unmount'ta timer sızıntısını önle.
    useEffect(() => {
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.toast,
                        {
                            top: insets.top + spacing.sm,
                            opacity,
                            transform: [{ translateY }],
                            backgroundColor:
                                toast.type === 'success' ? colors.primary : colors.danger,
                        },
                    ]}
                >
                    <Text style={styles.text}>{toast.message}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        // Üstte çizilsin (Android elevation + iOS shadow).
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        zIndex: 1000,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});