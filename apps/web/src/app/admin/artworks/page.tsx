// src/app/admin/artworks/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArtworkService, type Artwork, type ArtworkType } from '@/lib/artworks/artworkService';
import { ApiError } from '@/lib/auth/apiClient';

// Görüntüleme label'ı — enum'un kendisiyle oynamıyoruz, sadece tabloda okunabilirlik.
const ARTWORK_TYPE_LABELS: Record<ArtworkType, string> = {
    HAT: 'Hat',
    TEZHIP: 'Tezhip',
    MINYATUR: 'Minyatür',
    EBRU: 'Ebru',
    CINI: 'Çini',
    DIGER: 'Diğer',
};

export default function ArtworksListPage() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await ArtworkService.list({ limit: 50 });
            setArtworks(res.items);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Eserler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleDelete(id: string, title: string | null) {
        const label = title ?? '(başlıksız eser)';
        if (!confirm(`"${label}" silinsin mi? Bu işlem geri alınamaz.`)) return;
        try {
            await ArtworkService.remove(id);
            setArtworks((prev) => prev.filter((a) => a.id !== id));
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'Silme başarısız.');
        }
    }

    async function handleToggleFeatured(id: string, current: string | null) {
        const next = current === null; // şu an featured değilse → yap; featured'sa → kaldır
        setBusyId(id);
        try {
            await ArtworkService.setFeatured(id, next);
            // Backend "tek featured" garantisi veriyor: featured yapınca eskisi de sıfırlanır.
            // Bu yüzden tek satırı optimistic güncellemek yetmez — tüm listeyi tazeliyoruz.
            await load();
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'Günün eseri güncellenemedi.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Eserler</h1>
                <Link
                    href="/admin/artworks/new"
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                    + Yeni Eser
                </Link>
            </div>

            {loading && <p className="text-neutral-500">Yükleniyor…</p>}

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}{' '}
                    <button onClick={load} className="underline">
                        Tekrar dene
                    </button>
                </div>
            )}

            {!loading && !error && artworks.length === 0 && (
                <p className="text-neutral-500">Henüz eser yok. Yeni ekleyerek başla.</p>
            )}

            {!loading && !error && artworks.length > 0 && (
                <div className="overflow-hidden rounded-md border border-neutral-200">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-left text-neutral-600">
                            <tr>
                                <th className="px-4 py-3 font-medium">Başlık</th>
                                <th className="px-4 py-3 font-medium">Sanatçı</th>
                                <th className="px-4 py-3 font-medium">Tür</th>
                                <th className="px-4 py-3 font-medium">Durum</th>
                                <th className="px-4 py-3 font-medium text-center">Günün Eseri</th>
                                <th className="px-4 py-3 font-medium text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {artworks.map((a) => (
                                <tr key={a.id} className="border-t border-neutral-100">
                                    <td className="px-4 py-3">
                                        <span className="font-medium">{a.title ?? '(başlıksız)'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-600">{a.artist?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-neutral-600">{ARTWORK_TYPE_LABELS[a.type]}</td>
                                    <td className="px-4 py-3">
                                        {a.isPublished ? (
                                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                                                Yayında
                                            </span>
                                        ) : (
                                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                                                Taslak
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggleFeatured(a.id, a.featuredAt)}
                                            disabled={busyId === a.id}
                                            title={a.featuredAt ? 'Günün eserinden kaldır' : 'Günün eseri yap'}
                                            aria-label={a.featuredAt ? 'Günün eserinden kaldır' : 'Günün eseri yap'}
                                            className="text-lg leading-none disabled:opacity-40"
                                        >
                                            <span className={a.featuredAt ? 'text-amber-500' : 'text-neutral-300'}>
                                                {a.featuredAt ? '★' : '☆'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/admin/artworks/${a.slug}/edit`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Düzenle
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(a.id, a.title)}
                                            className="ml-4 text-red-600 hover:underline"
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}