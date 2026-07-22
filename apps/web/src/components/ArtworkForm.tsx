'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArtworkService,
    type CreateArtworkInput,
    type ArtworkType,
} from '@/lib/artworks/artworkService';
import { ApiError } from '@/lib/auth/apiClient';
import { ArtistCombobox } from '@/components/ArtistCombobox';

// Tür seçenekleri — enum + Türkçe label (tablo ile aynı map mantığı).
const TYPE_OPTIONS: { value: ArtworkType; label: string }[] = [
    { value: 'HAT', label: 'Hat' },
    { value: 'TEZHIP', label: 'Tezhip' },
    { value: 'MINYATUR', label: 'Minyatür' },
    { value: 'EBRU', label: 'Ebru' },
    { value: 'CINI', label: 'Çini' },
    { value: 'DIGER', label: 'Diğer' },
];

// Form state — string/bool alanlar (input uyumu). imageUrl BURADA YOK (upload'tan gelir).
interface ArtworkFormState {
    artistId: string;
    type: ArtworkType;
    title: string;
    script: string;
    period: string;
    arabicText: string;
    translation: string;
    sourceRef: string;
    description: string;
    isPublished: boolean;
}

const EMPTY: ArtworkFormState = {
    artistId: '',
    type: 'HAT',
    title: '',
    script: '',
    period: '',
    arabicText: '',
    translation: '',
    sourceRef: '',
    description: '',
    isPublished: true,
};

interface ArtworkFormProps {
    mode: 'create' | 'edit';
    artworkId?: string;          // edit'te zorunlu (mutasyon id ile)
    initial?: Partial<ArtworkFormState>;
    initialImageUrl?: string;    // edit'te mevcut görseli göstermek için
}

export function ArtworkForm({ mode, artworkId, initial, initialImageUrl }: ArtworkFormProps) {
    const router = useRouter();
    const [form, setForm] = useState<ArtworkFormState>({ ...EMPTY, ...initial });
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleChange<K extends keyof ArtworkFormState>(
        field: K,
        value: ArtworkFormState[K],
    ) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    // Boş opsiyonelleri undefined'a çevir. imageUrl'i ayrı ekliyoruz (upload sonrası).
    function toPayload(imageUrl?: string): CreateArtworkInput {
        return {
            artistId: form.artistId,
            type: form.type,
            // create'te imageUrl her zaman dolu gelir; edit'te undefined olabilir (dokunma).
            imageUrl: imageUrl as string,
            title: form.title.trim() || undefined,
            script: form.script.trim() || undefined,
            period: form.period.trim() || undefined,
            arabicText: form.arabicText.trim() || undefined,
            translation: form.translation.trim() || undefined,
            sourceRef: form.sourceRef.trim() || undefined,
            description: form.description.trim() || undefined,
            isPublished: form.isPublished,
        };
    }

    async function handleSubmit() {
        // Zorunlu alan kontrolü
        if (!form.artistId) {
            setError('Sanatçı seçimi zorunlu.');
            return;
        }
        if (mode === 'create' && !file) {
            setError('Görsel zorunlu.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // 1. ADIM: dosya seçilmişse upload et (create'te zorunlu, edit'te opsiyonel)
            let imageUrl: string | undefined;
            if (file) {
                const res = await ArtworkService.upload(file);
                imageUrl = res.imageUrl;
            }

            // 2. ADIM: create veya update
            if (mode === 'create') {
                // imageUrl kesin dolu (yukarıda file zorunluydu)
                await ArtworkService.create(toPayload(imageUrl));
            } else {
                // edit: imageUrl varsa güncelle, yoksa payload'dan çıkar (mevcut korunur)
                const payload = toPayload(imageUrl);
                if (!imageUrl) delete (payload as Partial<CreateArtworkInput>).imageUrl;
                await ArtworkService.update(artworkId!, payload);
            }

            router.push('/admin/artworks');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Kayıt başarısız.');
            setSubmitting(false);
        }
    }

    // Önizleme: yeni seçilen dosya > mevcut görsel
    const previewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : initialImageUrl),
        [file, initialImageUrl],
    );

    useEffect(() => {
        return () => {
            if (file && previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [file, previewUrl]);

    return (
        <div className="mx-auto max-w-xl p-6">
            <h1 className="mb-6 text-2xl font-semibold">
                {mode === 'create' ? 'Yeni Eser' : 'Eseri Düzenle'}
            </h1>

            {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Sanatçı combobox (aramali — 690 sanatci, veri kaybi fix) */}
                <Field label="Sanatçı *">
                    <ArtistCombobox
                        value={form.artistId}
                        onChange={(id) => handleChange('artistId', id)}
                        disabled={submitting}
                    />
                </Field>

                {/* Tür dropdown */}
                <Field label="Tür *">
                    <select
                        value={form.type}
                        onChange={(e) => handleChange('type', e.target.value as ArtworkType)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    >
                        {TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Field>

                {/* Görsel upload */}
                <Field label={mode === 'create' ? 'Görsel *' : 'Görsel (değiştirmek için seç)'}>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm"
                    />
                    {previewUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt="Önizleme"
                            className="mt-2 h-40 w-auto rounded-md border border-neutral-200 object-contain"
                        />
                    )}
                </Field>

                <Field label="Başlık">
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="Besmele-i Şerif"
                    />
                </Field>

                <Field label="Hat çeşidi / Script">
                    <input
                        type="text"
                        value={form.script}
                        onChange={(e) => handleChange('script', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="sülüs, nesih, divani…"
                    />
                </Field>

                <Field label="Dönem">
                    <input
                        type="text"
                        value={form.period}
                        onChange={(e) => handleChange('period', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="19. yy, 1435 (Hicri)…"
                    />
                </Field>

                <Field label="Arapça metin">
                    <textarea
                        value={form.arabicText}
                        onChange={(e) => handleChange('arabicText', e.target.value)}
                        rows={2}
                        dir="rtl"
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                </Field>

                <Field label="Çeviri">
                    <textarea
                        value={form.translation}
                        onChange={(e) => handleChange('translation', e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                </Field>

                <Field label="Kaynak (sourceRef)">
                    <input
                        type="text"
                        value={form.sourceRef}
                        onChange={(e) => handleChange('sourceRef', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        placeholder="Tevbe 40"
                    />
                </Field>

                <Field label="Açıklama">
                    <textarea
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                </Field>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isPublished}
                        onChange={(e) => handleChange('isPublished', e.target.checked)}
                    />
                    Yayında
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
                        onClick={() => router.push('/admin/artworks')}
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