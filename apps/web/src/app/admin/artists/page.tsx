'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArtistService, type Artist } from '@/lib/artists/artistService';
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

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await ArtistService.list({ limit: 50 });
      setArtists(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sanatçılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

      {loading && <p className="text-neutral-500">Yükleniyor…</p>}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button onClick={load} className="underline">
            Tekrar dene
          </button>
        </div>
      )}

      {!loading && !error && artists.length === 0 && (
        <p className="text-neutral-500">Henüz sanatçı yok. Yeni ekleyerek başla.</p>
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
    </div>
  );
}