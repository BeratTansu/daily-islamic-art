import type { Artwork } from './artworkService';

/**
 * Bir eserin GERCEK yayin durumu.
 *
 * Neden ucul: gorunurluk invariant'i backend'de `isPublished AND publishAt <= now()`.
 * Panelde sadece isPublished'a bakmak YALAN SOYLER — kuyrukta bekleyen
 * (isPublished:true + publishAt gelecekte) eser "Yayinda" gorunurdu ama
 * kullanici onu goremez.
 *
 * Iki alan iki soruya cevap verir:
 *   isPublished = admin izin verdi mi (izin kapisi)
 *   publishAt   = sirasi geldi mi (zaman esigi)
 */
export type PublishStatus = 'published' | 'queued' | 'draft';

export function getPublishStatus(artwork: Pick<Artwork, 'isPublished' | 'publishAt'>): PublishStatus {
    if (!artwork.isPublished) return 'draft';
    // publishAt yoksa backend invariant'i (publishAt <= now) SAGLANMAZ → feed'de gorunmez.
    // O yuzden "published" DEGIL: isPublished:true ama esik yok = henuz gerçek yayinda degil.
    // Bunu 'queued' say (admin onaylamis ama gorunur degil) → panel dogruyu soyler.
    // Not: setPublished artik publishAt'i set ettigi icin bu durum normalde olusmaz;
    // bu savunma amacli (import ham verisi vb.).
    if (!artwork.publishAt) return 'queued';
    return new Date(artwork.publishAt).getTime() <= Date.now() ? 'published' : 'queued';
}

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
    published: 'Yayında',
    queued: 'Kuyrukta',
    draft: 'Taslak',
};

export const PUBLISH_STATUS_CLASSES: Record<PublishStatus, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    queued: 'bg-amber-100 text-amber-700',
    draft: 'bg-neutral-100 text-neutral-500',
};

/** "25 Mar 2027" — kuyruk tarihini kisa goster. */
export function formatPublishDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}