import { ApiClient } from '../auth/apiClient';

// ── Tipler: backend kontratının client'taki tek kaynağı ──

// Combobox / dropdown icin dar tip. by-id endpoint'i tam bunu doner
// ({id, name, slug}) — bio/era/country yok. "Dar tip = az varsayim".
export interface ArtistRef {
  id: string;
  name: string;
  slug: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  era: string | null;
  country: string | null;
  avatarUrl: string | null; // şemada var; DTO'da yok (create/update'te göndermiyoruz)
  isContemporary: boolean;
  createdAt: string;
  // Liste endpoint'i _count ile eser sayısını döner
  _count?: { artworks: number };
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ArtistListResponse {
  items: Artist[];
  meta: ListMeta;
}

// Create: name zorunlu, gerisi opsiyonel (backend CreateArtistDto ile birebir)
export interface CreateArtistInput {
  name: string;
  bio?: string;
  era?: string;
  country?: string;
  isContemporary?: boolean;
}

// Update: hepsi opsiyonel (backend UpdateArtistDto = PartialType)
export type UpdateArtistInput = Partial<CreateArtistInput>;

// Liste sorgu parametreleri (backend QueryArtistDto ile uyumlu)
export interface ListArtistsParams {
  page?: number;
  limit?: number;
  q?: string;
  era?: string;
  country?: string;
  isContemporary?: boolean;
}

// ── Servis: sadece HTTP + tipli response. UI/state yok. ──

export const ArtistService = {
  list(params: ListArtistsParams = {}): Promise<ArtistListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.q) qs.set('q', params.q);
    if (params.era) qs.set('era', params.era);
    if (params.country) qs.set('country', params.country);
    if (params.isContemporary !== undefined) {
      qs.set('isContemporary', String(params.isContemporary));
    }
    const query = qs.toString();
    return ApiClient.get<ArtistListResponse>(`/artists${query ? `?${query}` : ''}`);
  },

  // Not: backend GET /artists/:slug ile getiriyor (id değil slug).
  getBySlug(slug: string): Promise<Artist> {
    return ApiClient.get<Artist>(`/artists/${slug}`);
  },

  // Combobox aramasi: isimde arar (backend findAll ?q= → name contains insensitive).
  // limit kucuk: dropdown'da 10-15 sonuc yeter, fazlasi gereksiz yuk.
  search(q: string, limit = 12): Promise<ArtistListResponse> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    return ApiClient.get<ArtistListResponse>(`/artists?${qs.toString()}`);
  },

  // Combobox edit modu: secili artistId'nin adini cekmek icin (id ile tek sanatci).
  // GET /artists/by-id/:id → {id, name, slug} (ArtistRef).
  getById(id: string): Promise<ArtistRef> {
    return ApiClient.get<ArtistRef>(`/artists/by-id/${id}`);
  },

  create(input: CreateArtistInput): Promise<Artist> {
    return ApiClient.post<Artist>('/artists', input);
  },

  update(id: string, input: UpdateArtistInput): Promise<Artist> {
    return ApiClient.patch<Artist>(`/artists/${id}`, input);
  },

  remove(id: string): Promise<void> {
    return ApiClient.delete<void>(`/artists/${id}`);
  },
};