// src/lib/collections/collectionService.ts
import { ApiClient } from '../auth/apiClient';

// GET /collections → liste kartı. DB şekli değil, API şekli:
// itemCount = Prisma _count, coverUrl = ilk item'ın görseli (boşsa null).
export interface CollectionListItem {
    id: string;
    name: string;
    itemCount: number;
    coverUrl: string | null;
}

// GET /collections/:id → grid içindeki eser.
// ArtworkListItem DEĞİL: type/featuredAt/title yok, addedAt var,
// artist sadece { name }. Benzemek aynı olmak değil.
export interface CollectionArtwork {
    id: string;
    slug: string;
    thumbUrl: string | null;
    imageUrl: string;
    artist: { name: string };
    addedAt: string;
}

export interface CollectionDetail {
    id: string;
    name: string;
    createdAt: string;
    items: CollectionArtwork[];
}

class CollectionService {
    // Sayfalama YOK — kullanıcı başına koleksiyon sayısı onlarca mertebesinde.
    async list(): Promise<CollectionListItem[]> {
        return ApiClient.get<CollectionListItem[]>('/collections');
    }

    async getOne(id: string): Promise<CollectionDetail> {
        return ApiClient.get<CollectionDetail>(`/collections/${id}`);
    }

    // Backend ayrıca name/createdAt/itemCount/coverUrl döndürüyor ama hiçbiri
    // işe yaramıyor (yeni koleksiyon → itemCount:0, coverUrl:null).
    // Çağıran tarafa lazım olan tek şey id (hemen addItem çağrılacak).
    // Liste ekranı create sonrası refetch eder. Dar tip = az varsayım.
    async create(name: string): Promise<{ id: string }> {
        return ApiClient.post<{ id: string }>('/collections', { name });
    }

    async update(id: string, name: string): Promise<{ id: string }> {
        return ApiClient.patch<{ id: string }>(`/collections/${id}`, { name });
    }

    // 204 → void. Cascade backend'de ($transaction).
    async remove(id: string): Promise<void> {
        await ApiClient.delete<void>(`/collections/${id}`);
    }

    // İkisi de idempotent, 204 döner. Like ile aynı gerekçe:
    // aynı sonuç = aynı cevap, 409 yok.
    async addItem(collectionId: string, artworkId: string): Promise<void> {
        await ApiClient.post<void>(`/collections/${collectionId}/items`, { artworkId });
    }

    async removeItem(collectionId: string, artworkId: string): Promise<void> {
        await ApiClient.delete<void>(`/collections/${collectionId}/items/${artworkId}`);
    }
}

export const collectionService = new CollectionService();