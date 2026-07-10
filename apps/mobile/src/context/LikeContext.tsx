// src/context/LikeContext.tsx
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

// Bu oturumda kullanıcının değiştirdiği beğeniler. Backend hâlâ kaynak;
// bu sadece üstüne yazılan bir katman.
//
// Neden gerekli: feed ve detay ayrı state tutuyor. Detayda beğenince
// feed'in `items` dizisi haberdar olmuyor (stack'te canlı, unmount olmamış).
// Ortak defter, ortak atada yaşar.
type Overrides = Record<string, boolean>;

interface LikeContextValue {
    // fallback: backend'den gelen isLiked. Defterde kayıt yoksa bu kullanılır.
    getIsLiked: (id: string, fallback?: boolean) => boolean;
    setOverride: (id: string, isLiked: boolean) => void;
    // Taze veri geldi (pull-to-refresh) → defter gereksiz, hatta tehlikeli:
    // eski bir kayıt backend'in doğru cevabını ezebilir.
    clear: () => void;
}

const LikeContext = createContext<LikeContextValue | null>(null);

export function LikeProvider({ children }: { children: ReactNode }) {
    const [overrides, setOverrides] = useState<Overrides>({});

    const getIsLiked = useCallback(
        (id: string, fallback = false) => overrides[id] ?? fallback,
        [overrides],
    );

    const setOverride = useCallback((id: string, isLiked: boolean) => {
        setOverrides((prev) => ({ ...prev, [id]: isLiked }));
    }, []);

    const clear = useCallback(() => setOverrides({}), []);

    const value = useMemo(
        () => ({ getIsLiked, setOverride, clear }),
        [getIsLiked, setOverride, clear],
    );

    return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
}

export function useLikeContext() {
    const ctx = useContext(LikeContext);
    if (!ctx) throw new Error('useLikeContext, LikeProvider içinde çağrılmalı.');
    return ctx;
}