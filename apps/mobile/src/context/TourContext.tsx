import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Ekranda olculmus bir hedefin konumu (window-goreli). */
export interface TourTargetRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Tur adimlarinin kimlikleri — hedef kayitlari bu anahtarla tutulur. */
export type TourTargetKey = 'dailyCard' | 'likeButton' | 'sortTabs' | 'collectionsTab';

interface TourContextValue {
    /** Bir hedefin olculen konumunu kaydet (measureInWindow sonucu). */
    registerTarget: (key: TourTargetKey, rect: TourTargetRect) => void;
    /** Kayitli konumu oku — yoksa null. */
    getTarget: (key: TourTargetKey) => TourTargetRect | null;
    /** Tur aktif mi (overlay ciziliyor mu). */
    isActive: boolean;
    startTour: () => void;
    endTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
    // Hedefler ref'te: her olcumde re-render tetiklemek gereksiz
    // (overlay zaten adim degisince yeniden ciziliyor).
    const targets = useRef<Partial<Record<TourTargetKey, TourTargetRect>>>({});
    const [isActive, setIsActive] = useState(false);

    const registerTarget = useCallback((key: TourTargetKey, rect: TourTargetRect) => {
        targets.current[key] = rect;
    }, []);

    const getTarget = useCallback((key: TourTargetKey) => {
        return targets.current[key] ?? null;
    }, []);

    const startTour = useCallback(() => setIsActive(true), []);
    const endTour = useCallback(() => setIsActive(false), []);

    return (
        <TourContext.Provider value={{ registerTarget, getTarget, isActive, startTour, endTour }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within TourProvider');
    return ctx;
}