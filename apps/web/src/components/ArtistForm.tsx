'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArtistService,
  type CreateArtistInput,
} from '@/lib/artists/artistService';
import { ApiError } from '@/lib/auth/apiClient';

// Form state — CreateArtistInput'la aynı alanlar, hepsi string/bool (input uyumu için).
interface ArtistFormState {
  name: string;
  bio: string;
  era: string;
  country: string;
  isContemporary: boolean;
}

const EMPTY: ArtistFormState = {
  name: '',
  bio: '',
  era: '',
  country: '',
  isContemporary: false,
};

interface ArtistFormProps {
  mode: 'create' | 'edit';
  artistId?: string; // edit'te zorunlu (mutasyon id ile)
  initial?: Partial<ArtistFormState>;
}

export function ArtistForm({ mode, artistId, initial }: ArtistFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ArtistFormState>({ ...EMPTY, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof ArtistFormState>(
    field: K,
    value: ArtistFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Boş opsiyonel alanları undefined'a çevir — backend'e '' göndermeyelim.
  function toPayload(): CreateArtistInput {
    return {
      name: form.name.trim(),
      bio: form.bio.trim() || undefined,
      era: form.era.trim() || undefined,
      country: form.country.trim() || undefined,
      isContemporary: form.isContemporary,
    };
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('İsim zorunlu.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'create') {
        await ArtistService.create(toPayload());
      } else {
        await ArtistService.update(artistId!, toPayload());
      }
      router.push('/admin/artists');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kayıt başarısız.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        {mode === 'create' ? 'Yeni Sanatçı' : 'Sanatçıyı Düzenle'}
      </h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Field label="İsim *">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Fatih Özkafa"
          />
        </Field>

        <Field label="Biyografi">
          <textarea
            value={form.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Dönem">
          <input
            type="text"
            value={form.era}
            onChange={(e) => handleChange('era', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Çağdaş, Osmanlı (17. yy)…"
          />
        </Field>

        <Field label="Ülke">
          <input
            type="text"
            value={form.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Türkiye"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isContemporary}
            onChange={(e) => handleChange('isContemporary', e.target.checked)}
          />
          Çağdaş sanatçı
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            onClick={() => router.push('/admin/artists')}
            disabled={submitting}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}