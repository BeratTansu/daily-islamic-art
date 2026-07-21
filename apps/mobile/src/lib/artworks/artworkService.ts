// src/lib/artworks/artworkService.ts
import { ApiClient } from '../auth/apiClient';

export type ArtworkType = 'HAT' | 'TEZHIP' | 'MINYATUR' | 'EBRU' | 'CINI' | 'DIGER';

// Feed siralama secenekleri — backend ArtworkSort enum ile ayni degerler.
// shuffle: Kesfet sekmesi (seed'li deterministik random). seed ile birlikte anlamli.
export type ArtworkSort = 'newest' | 'oldest' | 'mostLiked' | 'shuffle';

// Feed/liste kartı için yeterli alanlar (nested artist dahil)
export interface ArtworkListItem {
    id: string;
    title: string | null;
    slug: string;
    type: ArtworkType;
    imageUrl: string;
    thumbUrl: string | null;
    featuredAt: string | null;
    artist: { id: string; name: string; slug: string };
    // Opsiyonel: feed cache'ine giren obje bu alanı içermez,
    // backend cache'ten SONRA enrich eder (withLikeStatus).
    isLiked?: boolean;
    likeCount: number; // backend base sayi — override delta gosterimde eklenir
}

// Detay ekranı için tam alanlar
export interface ArtworkDetail extends ArtworkListItem {
    artistId: string;
    script: string | null;
    period: string | null;
    medium: string | null;
    dimensions: string | null;
    arabicText: string | null;
    translation: string | null;
    sourceRef: string | null;
    description: string | null;
    colorPalette: unknown | null;
    isPublished: boolean;
    createdAt: string;
    transcription: string | null;
    contributors: string | null;
    isLiked: boolean;
}

export interface ListMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface ArtworkListResponse {
    items: ArtworkListItem[];
    meta: ListMeta;
}

export interface ListParams {
    page?: number;
    limit?: number;
    type?: ArtworkType;
    artistId?: string;
    q?: string;
    refresh?: boolean; // pull-to-refresh: cache'i baypas et, taze veri iste
    sort?: ArtworkSort; // siralama; gonderilmezse backend newest kabul eder
    seed?: number; // SADECE sort=shuffle ile. Kesfet oturum/refresh basi uretir.
}

// GET /artworks/liked sadece page/limit kabul eder (QueryLikedDto).
// type/q gönderilirse backend forbidNonWhitelisted ile 400 döner.
// Bu yüzden ListParams yeniden kullanılmıyor — tip yalan söylemesin.
export interface LikedParams {
    page?: number;
    limit?: number;
}

class ArtworkService {
    async list(params: ListParams = {}): Promise<ArtworkListResponse> {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.type) qs.set('type', params.type);
        if (params.artistId) qs.set('artistId', params.artistId);
        if (params.q) qs.set('q', params.q);
        if (params.refresh) qs.set('refresh', 'true'); // sadece true ise gonder
        if (params.sort) qs.set('sort', params.sort); // newest ise gondermeye gerek yok (backend default)
        // seed: 0 gecerli bir seed olabilir → !== undefined kontrolu (truthy DEGIL).
        if (params.seed !== undefined) qs.set('seed', String(params.seed));
        const query = qs.toString();
        return ApiClient.get<ArtworkListResponse>(`/artworks${query ? `?${query}` : ''}`);
    }

    async getDaily(refresh = false): Promise<ArtworkDetail> {
        const query = refresh ? '?refresh=true' : '';
        return ApiClient.get<ArtworkDetail>(`/artworks/daily${query}`);
    }

    async getBySlug(slug: string): Promise<ArtworkDetail> {
        return ApiClient.get<ArtworkDetail>(`/artworks/${slug}`);
    }

    // ─── Beğeni ───
    // POST/DELETE ayrı: toggle endpoint'i YOK. "Beğenili olsun" / "beğenisiz olsun".
    // İkisi de idempotent, 204 döner → dönüş tipi void.

    async like(id: string): Promise<void> {
        await ApiClient.post<void>(`/artworks/${id}/like`);
    }

    async unlike(id: string): Promise<void> {
        await ApiClient.delete<void>(`/artworks/${id}/like`);
    }

    // "Beğendiklerim". Sıralama = beğeni tarihi (Like.createdAt desc),
    // eser oluşturma tarihi DEĞİL. Yayından kalkan eser listede görünmez.
    async listLiked(params: LikedParams = {}): Promise<ArtworkListResponse> {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return ApiClient.get<ArtworkListResponse>(`/artworks/liked${query ? `?${query}` : ''}`);
    }
}

export const artworkService = new ArtworkService();