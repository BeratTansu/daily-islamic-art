import { ApiClient } from '../auth/apiClient';

// ── Enum: backend ArtworkType ile birebir ──
export type ArtworkType = 'HAT' | 'TEZHIP' | 'MINYATUR' | 'EBRU' | 'CINI' | 'DIGER';

// Liste item'ında gelen nested artist (findAll → select: id/name/slug)
export interface ArtworkArtistRef {
  id: string;
  name: string;
  slug: string;
}

// ── Tipler: backend kontratının client'taki tek kaynağı ──

export interface Artwork {
  id: string;
  title: string | null;
  slug: string;
  artistId: string;
  type: ArtworkType;
  imageUrl: string;
  script: string | null;
  period: string | null;
  medium: string | null;
  dimensions: string | null;
  arabicText: string | null;
  translation: string | null;
  sourceRef: string | null;
  description: string | null;
  thumbUrl: string | null;
  colorPalette: unknown | null; // JSONB; admin panelde düzenlenmiyor
  isPublished: boolean;
  featuredAt: string | null;    // read-only burada; set etme toggle adımında (backend değişikliği)
  createdAt: string;
  // Liste endpoint'i include ile nested artist döner; detay (findOneBySlug) full artist dönebilir
  artist?: ArtworkArtistRef;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ArtworkListResponse {
  items: Artwork[];
  meta: ListMeta;
}

// Create: artistId + type + imageUrl zorunlu (backend CreateArtworkDto ile birebir).
// featuredAt ve colorPalette bilinçli olarak YOK (DTO'da featuredAt yok; colorPalette forma girilmiyor).
export interface CreateArtworkInput {
  artistId: string;
  type: ArtworkType;
  imageUrl: string;      // upload'tan gelir → zorunlu
  title?: string;
  script?: string;
  period?: string;
  medium?: string;
  dimensions?: string;
  arabicText?: string;
  translation?: string;
  sourceRef?: string;
  description?: string;
  thumbUrl?: string;
  isPublished?: boolean;
}

// Update: hepsi opsiyonel (backend UpdateArtworkDto = PartialType)
export type UpdateArtworkInput = Partial<CreateArtworkInput>;

// Liste sorgu parametreleri (backend QueryArtworkDto ile uyumlu)
export interface ListArtworksParams {
  page?: number;
  limit?: number;
  q?: string;
  type?: ArtworkType;
  script?: string;
  artistId?: string;
}

// Admin listesi query tipi (public list'ten ayrı — isPublished/hasImage sadece burada)
export interface AdminListParams {
  page?: number;
  limit?: number;
  isPublished?: boolean;
  hasImage?: boolean;
  q?: string;
}

// upload dönüşü (POST /artworks/upload → { imageUrl, thumbUrl })
// thumbUrl null olabilir: thumb üretimi patlarsa (bozuk/aşırı büyük görsel)
// upload batmaz, null döner — feed'de thumbUrl ?? imageUrl fallback devreye girer.
export interface UploadResult {
  imageUrl: string;
  thumbUrl: string | null;
}

// ── Servis: sadece HTTP + tipli response. UI/state yok. ──

export const ArtworkService = {
  list(params: ListArtworksParams = {}): Promise<ArtworkListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.q) qs.set('q', params.q);
    if (params.type) qs.set('type', params.type);
    if (params.script) qs.set('script', params.script);
    if (params.artistId) qs.set('artistId', params.artistId);
    const query = qs.toString();
    return ApiClient.get<ArtworkListResponse>(`/artworks${query ? `?${query}` : ''}`);
  },

  listAdmin(params: AdminListParams = {}): Promise<ArtworkListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.isPublished !== undefined) qs.set('isPublished', String(params.isPublished));
    if (params.hasImage !== undefined) qs.set('hasImage', String(params.hasImage));
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return ApiClient.get<ArtworkListResponse>(`/artworks/admin${query ? `?${query}` : ''}`);
  },

  // Not: backend GET /artworks/:slug ile getiriyor (id değil slug).
  getBySlug(slug: string): Promise<Artwork> {
    return ApiClient.get<Artwork>(`/artworks/${slug}`);
  },

  getBySlugAdmin(slug: string): Promise<Artwork> {
    return ApiClient.get<Artwork>(`/artworks/admin/${slug}`);
  },

  create(input: CreateArtworkInput): Promise<Artwork> {
    return ApiClient.post<Artwork>('/artworks', input);
  },

  update(id: string, input: UpdateArtworkInput): Promise<Artwork> {
    return ApiClient.patch<Artwork>(`/artworks/${id}`, input);
  },

  remove(id: string): Promise<void> {
    return ApiClient.delete<void>(`/artworks/${id}`);
  },

  setFeatured(id: string, featured: boolean): Promise<Artwork> {
    return ApiClient.patch<Artwork>(`/artworks/${id}/featured`, { featured });
  },

  setPublished(id: string, published: boolean): Promise<Artwork> {
    return ApiClient.patch<Artwork>(`/artworks/${id}/publish`, { published });
  },

  // Artist'te olmayan tek metod: iki-adım upload akışının 1. adımı.
  // FormData'yı ApiClient.upload multipart olarak gönderir (Content-Type set etmez).
  // ⚠️ ApiClient.upload imzasını doğrula — aşağıda (path, formData) varsayıldı.
  upload(file: File): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file); // backend FileInterceptor('file') ile birebir alan adı
    return ApiClient.upload<UploadResult>('/artworks/upload', form);
  },
};