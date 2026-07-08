// src/lib/artworks/artworkService.ts
import { ApiClient } from '../auth/apiClient';

export type ArtworkType = 'HAT' | 'TEZHIP' | 'MINYATUR' | 'EBRU' | 'CINI' | 'DIGER';

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
}

class ArtworkService {
    async list(params: ListParams = {}): Promise<ArtworkListResponse> {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.type) qs.set('type', params.type);
        if (params.artistId) qs.set('artistId', params.artistId);
        if (params.q) qs.set('q', params.q);
        const query = qs.toString();
        return ApiClient.get<ArtworkListResponse>(`/artworks${query ? `?${query}` : ''}`);
    }

    async getDaily(): Promise<ArtworkDetail> {
        return ApiClient.get<ArtworkDetail>('/artworks/daily');
    }

    async getBySlug(slug: string): Promise<ArtworkDetail> {
        return ApiClient.get<ArtworkDetail>(`/artworks/${slug}`);
    }
}

export const artworkService = new ArtworkService();