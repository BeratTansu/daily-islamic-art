import { File, Paths } from 'expo-file-system';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';

export type DownloadResult =
    | { ok: true }
    | { ok: false; reason: 'permission' | 'error' };

/**
 * R2'deki ham görseli cihaza indirir ve galeriye kaydeder.
 * ApiClient'tan GEÇMEZ — CDN'e doğrudan gider, auth yok.
 * İki adım: (1) File.downloadFileAsync ile cache'e indir,
 *           (2) Asset.create ile galeriye yaz.
 */
export async function downloadImageToGallery(
    imageUrl: string,
    artworkId: string,
): Promise<DownloadResult> {
    // 1. İzin — writeOnly: sadece kaydetme, tüm galeriyi okuma istemiyoruz
    const { status } = await requestPermissionsAsync(true);
    if (status !== 'granted') {
        return { ok: false, reason: 'permission' };
    }

    try {
        // 2. Cache'e indir. Dosya zaten varsa tekrar indirme (idempotent),
        //    ama galeriye kaydetmeyi YİNE yap (kullanıcı galeriden silmiş olabilir).
        const destination = new File(Paths.cache, `dia-${artworkId}.jpg`);

        // Cache kontrolü YOK: "İndir" kullanıcının kasıtlı aksiyonu, her basışta indirmeli.
        // idempotent: true → cache'te eski dosya varsa üstüne yazar (DestinationAlreadyExists atmaz).
        const file = await File.downloadFileAsync(imageUrl, destination, { idempotent: true });

        // 3. Galeriye kaydet (legacy API — Expo Go'da çalışır, dev build gerekmez)
        console.log('[download] indirilen dosya uri:', file.uri);
        await saveToLibraryAsync(file.uri);
        console.log('[download] saveToLibraryAsync tamamlandı');

        return { ok: true };
    } catch {
        return { ok: false, reason: 'error' };
    }
}