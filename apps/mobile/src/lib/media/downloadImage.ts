import { File, Paths } from 'expo-file-system';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

export type DownloadResult =
    | { ok: true }
    | { ok: false; reason: 'permission' | 'error' };

export type ShareResult =
    | { ok: true }
    | { ok: false; reason: 'unavailable' | 'error' };

export type WallpaperResult =
    | { ok: true }
    | { ok: false; reason: 'unsupported' | 'error' };

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

/**
 * Eser gorselini sistem paylasim sheet'i ile paylasir.
 *
 * downloadImageToGallery'den farklari:
 *  - IZIN YOK (galeriye yazmiyoruz, cache'ten paylasiyoruz)
 *  - Sadece GORSEL gider. expo-sharing dosya paylasir, metin tasimaz
 *    (dialogTitle sadece Android secici basligi, mesaja girmez).
 *
 * Kullanici sheet'i iptal ederse shareAsync sessizce doner (hata atmaz)
 * → cagiran taraf BASARI toast'u GOSTERMEMELI, yalan olur.
 */
export async function shareArtworkImage(
    imageUrl: string,
    artworkId: string,
): Promise<ShareResult> {
    try {
        // Cihazda paylasim var mi (bazi emulatorlerde yok)
        const available = await Sharing.isAvailableAsync();
        if (!available) {
            return { ok: false, reason: 'unavailable' };
        }

        // Cache'e indir — indir akisiyla ayni desen, ayni dosya adi.
        // idempotent: true → varsa ustune yazar, DestinationAlreadyExists atmaz.
        const destination = new File(Paths.cache, `dia-${artworkId}.jpg`);
        const file = await File.downloadFileAsync(imageUrl, destination, {
            idempotent: true,
        });

        await Sharing.shareAsync(file.uri, {
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg', // iOS
        });

        return { ok: true };
    } catch {
        return { ok: false, reason: 'error' };
    }
}

/**
 * Eser gorselini sistemin "duvar kagidi olarak ayarla" ekranina gonderir.
 *
 * ACTION_ATTACH_DATA kullaniliyor, WallpaperManager.setBitmap DEGIL:
 * dogrudan API kullanicinin duvar kagidini SORMADAN degistirir.
 * Sistem secicisi kirpma + "ana ekran mi kilit ekrani mi" kontrolunu
 * kullaniciya birakir — daha durust.
 *
 * ANDROID-ONLY: iOS'ta Apple policy nedeniyle karsiligi YOK.
 *
 * ⚠️ DOGRULANMADI: intent'e file:// URI vermek Android 7+ FileUriExposedException
 * atabilir (FileProvider gerekir). Build sonrasi cihazda test edilmeli.
 * Patlarsa catch yakalar, uygulama cokmez, sadece bu aksiyon hata verir.
 */
export async function setArtworkAsWallpaper(
    imageUrl: string,
    artworkId: string,
): Promise<WallpaperResult> {
    if (Platform.OS !== 'android') {
        return { ok: false, reason: 'unsupported' };
    }

    try {
        const destination = new File(Paths.cache, `dia-${artworkId}.jpg`);
        const file = await File.downloadFileAsync(imageUrl, destination, {
            idempotent: true,
        });

        // file:// URI'si baska uygulamaya (wallpaper secici) verilemez (FileUriExposedException).
        // contentUri Expo'nun FileProvider'i uzerinden content:// dondurur → intent'e guvenle gecer.
        await IntentLauncher.startActivityAsync('android.intent.action.ATTACH_DATA', {
            data: file.contentUri,
            type: 'image/jpeg',
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION (content:// ile calisir)
        });

        return { ok: true };
    } catch {
        return { ok: false, reason: 'error' };
    }
}