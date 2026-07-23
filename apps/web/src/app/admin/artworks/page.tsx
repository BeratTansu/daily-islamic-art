'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArtworkService, type Artwork, type ArtworkType, type ListMeta } from '@/lib/artworks/artworkService';
import { ApiError } from '@/lib/auth/apiClient';
import {
    getPublishStatus,
    PUBLISH_STATUS_LABELS,
    PUBLISH_STATUS_CLASSES,
    formatPublishDate,
} from '@/lib/artworks/publishStatus';

// Görüntüleme label'ı — enum'un kendisiyle oynamıyoruz, sadece tabloda okunabilirlik.
const ARTWORK_TYPE_LABELS: Record<ArtworkType, string> = {
    HAT: 'Hat',
    TEZHIP: 'Tezhip',
    MINYATUR: 'Minyatür',
    EBRU: 'Ebru',
    CINI: 'Çini',
    DIGER: 'Diğer',
};

type PublishFilter = 'all' | 'published' | 'draft';

export default function ArtworksListPage() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Yeni Eklenen Filtre ve Sayfalama State'leri
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<ListMeta | null>(null);
    const [publishFilter, setPublishFilter] = useState<PublishFilter>('draft');
    const [hasImageOnly, setHasImageOnly] = useState(true);

    // Arama: input'un anlik degeri (search) + debounce'lu sorgu degeri (debouncedSearch).
    // Ikisi ayri cunku input her tusta guncellenmeli ama istek atilmamali.
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // 400ms yazma durunca sorgu degerini guncelle.
    // Sayfa 1'e donus SART: sayfa 5'teyken arama yapinca sonuc 2 sayfaysa bos ekran gelirdi.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Güncellenen Fetch Fonksiyonu (useCallback ile)
    const fetchArtworks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await ArtworkService.listAdmin({
                page,
                limit: 20,
                isPublished: publishFilter === 'all' ? undefined : publishFilter === 'published',
                hasImage: hasImageOnly ? true : undefined,
                q: debouncedSearch.trim() || undefined,
            });
            setArtworks(res.items);
            setMeta(res.meta);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Eserler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [page, publishFilter, hasImageOnly, debouncedSearch]);

    // active guard: hizli yazarken eski istek gec donup yeni sonucu EZMESIN.
    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await ArtworkService.listAdmin({
                    page,
                    limit: 20,
                    isPublished: publishFilter === 'all' ? undefined : publishFilter === 'published',
                    hasImage: hasImageOnly ? true : undefined,
                    q: debouncedSearch.trim() || undefined,
                });
                if (!active) return;
                setArtworks(res.items);
                setMeta(res.meta);
            } catch (e) {
                if (!active) return;
                setError(e instanceof ApiError ? e.message : 'Eserler yüklenemedi.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [page, publishFilter, hasImageOnly, debouncedSearch]);

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
            // Tüm listeyi tazeliyoruz
            await fetchArtworks();
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'Günün eseri güncellenemedi.');
        } finally {
            setBusyId(null);
        }
    }

    // Yeni Eklenen Yayınlama Handler'ı
    async function handleTogglePublished(id: string, current: boolean) {
        setBusyId(id);
        try {
            await ArtworkService.setPublished(id, !current);
            await fetchArtworks();
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'Yayın durumu güncellenemedi.');
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

            {/* UI: Filtre Barı */}
            <div className="flex gap-4 items-center mb-4 text-sm">
                <select
                    value={publishFilter}
                    onChange={(e) => { setPublishFilter(e.target.value as PublishFilter); setPage(1); }}
                    className="border rounded px-2 py-1 bg-white"
                >
                    <option value="draft">Taslak</option>
                    <option value="published">Yayında</option>
                    <option value="all">Hepsi</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={hasImageOnly}
                        onChange={(e) => { setHasImageOnly(e.target.checked); setPage(1); }}
                    />
                    Sadece görselli
                </label>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Başlık veya sanatçı ara…"
                    className="rounded border border-neutral-300 px-3 py-1 text-sm w-64"
                />

                <span className="text-sm text-gray-500 ml-auto">{meta?.total ?? 0} eser</span>
            </div>

            {loading && <p className="text-neutral-500">Yükleniyor…</p>}

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}{' '}
                    <button onClick={fetchArtworks} className="underline">
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
                                <th className="px-4 py-3 font-medium">Görsel</th>
                                <th className="px-4 py-3 font-medium">Başlık</th>
                                <th className="px-4 py-3 font-medium">Sanatçı</th>
                                <th className="px-4 py-3 font-medium">Tür</th>
                                <th className="px-4 py-3 font-medium">Durum</th>
                                <th className="px-4 py-3 font-medium">Yayın Tarihi</th>
                                <th className="px-4 py-3 font-medium text-center">Yayın</th>
                                <th className="px-3 py-2 font-medium text-center whitespace-nowrap">Günün Eseri</th>
                                <th className="px-4 py-3 font-medium text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {artworks.map((a) => (
                                <tr key={a.id} className="border-t border-neutral-100 align-middle">
                                    {/* Görsel Sütunu */}
                                    <td className="px-3 py-1.5">
                                        {a.imageUrl ? (
                                            // thumbUrl varsa onu kullan — panel listesi 2606 satir,
                                            // tam boy gorsel cekmek gereksiz (thumbnail sistemi zaten kuruldu).
                                            <img
                                                src={a.thumbUrl ?? a.imageUrl}
                                                alt=""
                                                className="w-10 h-10 object-cover rounded"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-neutral-100 rounded" />
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="font-medium">{a.title ?? '(başlıksız)'}</span>
                                    </td>
                                    <td className="px-3 py-2 text-neutral-600">{a.artist?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-neutral-600">{ARTWORK_TYPE_LABELS[a.type]}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const status = getPublishStatus(a);
                                            return (
                                                <span
                                                    className={`rounded px-1.5 py-0.5 text-xs ${PUBLISH_STATUS_CLASSES[status]}`}
                                                >
                                                    {PUBLISH_STATUS_LABELS[status]}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                                        {formatPublishDate(a.publishAt)}
                                    </td>
                                    {/* Yayın Sütunu */}
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleTogglePublished(a.id, a.isPublished)}
                                            disabled={busyId === a.id}
                                            className="text-xl disabled:opacity-40 leading-none"
                                            title={a.isPublished ? 'Yayından kaldır' : 'Yayınla'}
                                        >
                                            {a.isPublished ? '✅' : '⬜'}
                                        </button>
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

            {/* Sayfalama — meta'dan turer, uydurma sayfa sayisi yok. */}
            {!loading && !error && meta && meta.pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50"
                    >
                        ← Önceki
                    </button>

                    <span className="text-neutral-600">
                        Sayfa {meta.page} / {meta.pages}
                    </span>

                    <button
                        onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                        disabled={page >= meta.pages}
                        className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50"
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </div>
    );
}