'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArtistService, type Artist, type ListMeta } from '@/lib/artists/artistService';
import { ApiError } from '@/lib/auth/apiClient';

export default function ArtistsListPage() {
  return (
    <ArtistsList />
  );
}

function ArtistsList() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ListMeta | null>(null);

  // Arama: anlik input (search) + debounce'lu sorgu (debouncedSearch).
  // Eserler sayfasiyla ayni pattern — tutarlilik.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 400ms yazma durunca sorgula. Sayfa 1'e donus SART:
  // sayfa 5'teyken arama yapinca sonuc 2 sayfaysa bos ekran gelirdi.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // active guard: hizli yazarken eski istek gec donup yeni sonucu EZMESIN.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ArtistService.list({
          page,
          limit: 20,
          q: debouncedSearch.trim() || undefined,
        });
        if (!active) return;
        setArtists(res.items);
        setMeta(res.meta);
      } catch (e) {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : 'Sanatçılar yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [page, debouncedSearch]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await ArtistService.remove(id);
      setArtists((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Silme başarısız.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sanatçılar</h1>
        <Link
          href="/admin/artists/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Yeni Sanatçı
        </Link>
      </div>

      {/* Filtre bari — eserler sayfasiyla ayni dil. */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sanatçı ara…"
          className="w-64 rounded border border-neutral-300 px-3 py-1 text-sm"
        />
        <span className="ml-auto text-sm text-neutral-500">{meta?.total ?? 0} sanatçı</span>
      </div>

      {loading && <p className="text-neutral-500">Yükleniyor…</p>}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button onClick={() => setPage((p) => p)} className="underline">
            Tekrar dene
          </button>
        </div>
      )}

      {!loading && !error && artists.length === 0 && (
        <p className="text-neutral-500">
          {debouncedSearch ? 'Aramanızla eşleşen sanatçı yok.' : 'Henüz sanatçı yok. Yeni ekleyerek başla.'}
        </p>
      )}

      {!loading && !error && artists.length > 0 && (
        <div className="overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">İsim</th>
                <th className="px-4 py-3 font-medium">Dönem</th>
                <th className="px-4 py-3 font-medium">Ülke</th>
                <th className="px-4 py-3 font-medium">Eser</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((a) => (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <span className="font-medium">{a.name}</span>
                    {a.isContemporary && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                        Çağdaş
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{a.era ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.country ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">{a._count?.artworks ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/artists/${a.slug}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Düzenle
                    </Link>
                    <button
                      onClick={() => handleDelete(a.id, a.name)}
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

      {/* Sayfalama — meta'dan turer, eserler sayfasiyla ayni. */}
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