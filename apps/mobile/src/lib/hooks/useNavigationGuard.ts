import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

// Hızlı çift/üçlü dokunma → tek navigasyon. İlk push'tan sonra kilit,
// ekran tekrar odağa gelince (geri dönünce) açılır.
export function useNavigationGuard() {
    const navigating = useRef(false);

    // Ekran tekrar odağa gelince kilidi aç (detaydan geri dönüş).
    useFocusEffect(
        useCallback(() => {
            navigating.current = false;
        }, []),
    );

    return useCallback((fn: () => void) => {
        if (navigating.current) return;
        navigating.current = true;
        fn();
    }, []);
}