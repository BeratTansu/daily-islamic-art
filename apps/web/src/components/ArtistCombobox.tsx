'use client';

import { useEffect, useRef, useState } from 'react';
import { ArtistService, type ArtistRef } from '@/lib/artists/artistService';
import { ApiError } from '@/lib/auth/apiClient';

interface ArtistComboboxProps {
    value: string;                    // secili artistId ('' = secilmemis)
    onChange: (artistId: string) => void;
    disabled?: boolean;
}

export function ArtistCombobox({ value, onChange, disabled }: ArtistComboboxProps) {
    const [query, setQuery] = useState('');       // input'taki metin
    const [results, setResults] = useState<ArtistRef[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // ── Edit modu: mount'ta value doluysa secili sanatcinin adini cek ──
    // Bu OLMAZSA veri kaybi geri gelir: kullanici secili sanatciyi goremez,
    // "bos mu?" diye panikle yanlis secer.
    useEffect(() => {
        if (!value) return;
        let active = true;
        ArtistService.getById(value)
            .then((a) => {
                if (active) setQuery(a.name); // input'ta secili sanatci adi gorunur
            })
            .catch(() => {
                // id bulunamadi (silinmis sanatci?) — sessiz gec, input bos kalir
            });
        return () => {
            active = false;
        };
        // sadece mount'ta + value degisirse (dis kaynakli). Kullanici secince
        // onChange -> value degisir ama query'yi zaten elle set ediyoruz (asagida).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // ── Arama: query degisince 300ms debounce + race guard ──
    useEffect(() => {
        const trimmed = query.trim();
        // Bos veya cok kisa: arama yapma, listeyi temizle
        if (trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        let active = true; // race guard: eski arama yeni sonucun ustune yazmasin
        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            ArtistService.search(trimmed)
                .then((res) => {
                    if (!active) return;
                    setResults(res.items);
                    setLoading(false);
                })
                .catch((e) => {
                    if (!active) return;
                    setError(e instanceof ApiError ? e.message : 'Arama başarısız.');
                    setLoading(false);
                });
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query]);

    // ── Disari tiklayinca dropdown kapanir ──
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelect(artist: ArtistRef) {
        onChange(artist.id);   // forma bildir
        setQuery(artist.name); // input'ta secili adi goster
        setOpen(false);
        setResults([]);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value);
        setOpen(true);
        // Kullanici yazmaya baslayinca eski secim gecersiz — ama onChange('')
        // CAGIRMIYORUZ: yazip vazgecerse (blur) eski secim korunmali.
        // Secim ancak bir sonuca tiklayinca degisir.
    }

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                disabled={disabled}
                placeholder="Sanatçı ara (en az 2 harf)…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            />

            {open && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                    {loading && (
                        <div className="px-3 py-2 text-sm text-neutral-500">Aranıyor…</div>
                    )}
                    {error && (
                        <div className="px-3 py-2 text-sm text-red-600">{error}</div>
                    )}
                    {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
                        <div className="px-3 py-2 text-sm text-neutral-500">Sonuç yok.</div>
                    )}
                    {!loading && !error && query.trim().length < 2 && (
                        <div className="px-3 py-2 text-sm text-neutral-400">
                            Aramak için en az 2 harf yazın.
                        </div>
                    )}
                    {results.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSelect(a)}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 ${
                                a.id === value ? 'bg-neutral-50 font-medium' : ''
                            }`}
                        >
                            {a.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}