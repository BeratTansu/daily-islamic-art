// src/lib/artworks/useLike.ts
import { useCallback } from 'react';
import { artworkService } from './artworkService';
import { useLikeContext } from '../../context/LikeContext';
import { useToast } from '../../context/ToastContext';

// Optimistic beğeni. State LikeContext'te (ortak defter) yaşar —
// feed ve detay aynı defteri okur, ayrışmazlar.
export function useLike() {
    const { setOverride } = useLikeContext();
    const { showToast } = useToast();

    // Toggle: kalp butonu. Mevcut duruma göre POST/DELETE.
    const toggle = useCallback(
        async (id: string, currentIsLiked: boolean) => {
            const next = !currentIsLiked;
            setOverride(id, next); // optimistic
            try {
                if (next) await artworkService.like(id);
                else await artworkService.unlike(id);
            } catch {
                setOverride(id, currentIsLiked); // geri al
                showToast('Beğeni kaydedilemedi', 'error');
            }
        },
        [setOverride, showToast],
    );

    // Çift dokunma: HER ZAMAN beğenir, asla kaldırmaz.
    // Bu ayrım POST/DELETE'in ayrı endpoint olmasıyla mümkün.
    // Toggle endpoint'i olsaydı, zaten beğenili esere çift dokunmak beğeniyi kaldırırdı.
    const likeOnly = useCallback(
        async (id: string, currentIsLiked: boolean) => {
            if (currentIsLiked) return; // zaten beğenili, istek bile atma
            setOverride(id, true);
            try {
                await artworkService.like(id);
            } catch {
                setOverride(id, false);
                showToast('Beğeni kaydedilemedi', 'error');
            }
        },
        [setOverride, showToast],
    );

    return { toggle, likeOnly };
}