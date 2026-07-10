// src/lib/artworks/useLike.ts
import { useCallback } from 'react';
import { artworkService } from './artworkService';

// Optimistic beğeni. Hook state TUTMAZ — çağıran ekran tutar.
// Gerekçe: aynı eser feed'de ve detayda görünebilir; state hook'ta olsaydı
// her kullanımda ayrı kopya olurdu. Ekran, sahip olduğu veriyi günceller.
//
// applyLocal(id, isLiked): ekranın state'ini güncelleyen callback.
//   Önce optimistic çağrılır, hata olursa eski değerle tekrar çağrılır.
export function useLike(applyLocal: (id: string, isLiked: boolean) => void) {
    // Toggle: kalp butonu için. Mevcut duruma göre POST/DELETE.
    const toggle = useCallback(
        async (id: string, currentIsLiked: boolean) => {
            const next = !currentIsLiked;
            applyLocal(id, next); // optimistic
            try {
                if (next) await artworkService.like(id);
                else await artworkService.unlike(id);
            } catch (e) {
                applyLocal(id, currentIsLiked); // geri al
                console.warn('Beğeni kaydedilemedi:', e); // TODO: toast (gün sonu)
            }
        },
        [applyLocal],
    );

    // Çift dokunma: HER ZAMAN beğenir, asla kaldırmaz.
    // Bu ayrım POST/DELETE'in ayrı endpoint olmasıyla mümkün.
    // Toggle endpoint'i olsaydı, zaten beğenili esere çift dokunmak beğeniyi kaldırırdı.
    const likeOnly = useCallback(
        async (id: string, currentIsLiked: boolean) => {
            if (currentIsLiked) return; // zaten beğenili, istek bile atma
            applyLocal(id, true);
            try {
                await artworkService.like(id);
            } catch (e) {
                applyLocal(id, false);
                console.warn('Beğeni kaydedilemedi:', e); // TODO: toast (gün sonu)
            }
        },
        [applyLocal],
    );

    return { toggle, likeOnly };
}