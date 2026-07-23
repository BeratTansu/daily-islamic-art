import { useCallback, useEffect, useRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { useTour, type TourTargetKey } from '../context/TourContext';

/**
 * Bir elemani tur hedefi olarak isaretler.
 *
 * onLayout TETIKLEYICI, olcum kaynagi DEGIL: onLayout parent-goreli
 * koordinat verir, spotlight window-goreli lazim → measureInWindow.
 */
export function TourTarget({
    tourKey,
    children,
    ...rest
}: ViewProps & { tourKey: TourTargetKey; children: React.ReactNode }) {
    const { registerTarget, isActive } = useTour();
    const ref = useRef<View>(null);

    const measure = useCallback(() => {
        // setTimeout(0): layout commit'i bitsin, yoksa 0 doner.
        setTimeout(() => {
            ref.current?.measureInWindow((x, y, width, height) => {
                if (width > 0 && height > 0) {
                    registerTarget(tourKey, { x, y, width, height });
                }
            });
        }, 0);
    }, [tourKey, registerTarget]);

    // Tur acildiginda TEKRAR olc: onLayout sadece layout degisiminde tetiklenir,
    // araya wrapper girmesi veya scroll gibi durumlarda konum kayabilir.
    useEffect(() => {
        if (isActive) measure();
    }, [isActive, measure]);

    return (
        <View ref={ref} onLayout={measure} collapsable={false} {...rest}>
            {children}
        </View>
    );
}