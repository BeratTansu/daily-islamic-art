'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArtworkService, type AdminStats } from '@/lib/artworks/artworkService';
import { ApiError } from '@/lib/auth/apiClient';
import { formatPublishDate } from '@/lib/artworks/publishStatus';

export default function AdminPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await ArtworkService.getAdminStats();
                if (!active) return;
                setStats(res);
            } catch (e) {
                if (!active) return;
                setError(e instanceof ApiError ? e.message : 'İstatistikler yüklenemedi.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="mb-6 text-2xl font-semibold">Genel Bakış</h1>

            {loading && <p className="text-neutral-500">Yükleniyor…</p>}

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!loading && !error && stats && (
                <>
                    {/* Toplam: koleksiyonun buyuklugu — en ust, belirgin. */}
                    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-5">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">
                            Toplam Eser
                        </div>
                        <div className="mt-1 text-4xl font-semibold text-neutral-900">
                            {stats.total.toLocaleString('tr-TR')}
                        </div>
                        {/* Uc renkli oran cubugu: yayinda/kuyrukta/taslak dagilimi.
                            Payda = uc durumun toplami (total DEGIL): 1 eser isPublished:true
                            + publishAt:null olabilir → uc kategoriye de girmez, total'dan
                            kucuk kalir. Toplami payda alinca cubuk hep %100 dolar. */}
                        <StatusBar
                            published={stats.published}
                            queued={stats.queued}
                            draft={stats.draft}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <StatCard label="Yayında" value={stats.published} accent="emerald" />
                        <StatCard label="Kuyrukta" value={stats.queued} accent="amber" />
                        <StatCard label="Taslak" value={stats.draft} accent="neutral" />
                        <StatCard label="Sanatçı" value={stats.artists} accent="neutral" />
                    </div>

                    {/* Kuyruk durumu: yetkilinin en cok ihtiyaci olan bilgi —
                        "ne zamana kadar otomatik akis var, ne zaman yeni eser eklemeliyim". */}
                    <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
                        <h2 className="mb-1 text-sm font-medium text-neutral-900">Yayın Kuyruğu</h2>
                        {stats.queued > 0 ? (
                            <p className="text-sm text-neutral-600">
                                <span className="font-medium text-neutral-900">{stats.queued}</span> eser sırada.
                                Otomatik yayın{' '}
                                <span className="font-medium text-neutral-900">
                                    {formatPublishDate(stats.queueEndsAt)}
                                </span>{' '}
                                tarihine kadar devam ediyor
                                {(() => {
                                    const days = daysUntil(stats.queueEndsAt);
                                    return days !== null ? ` (yaklaşık ${days} gün).` : '.';
                                })()}
                            </p>
                        ) : (
                            <p className="text-sm text-amber-700">
                                Kuyrukta eser yok. Yeni eserler yayın sırasına alınmalı.
                            </p>
                        )}
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Link
                            href="/admin/artworks"
                            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                        >
                            Eserleri Yönet
                        </Link>
                        <Link
                            href="/admin/artists"
                            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
                        >
                            Sanatçıları Yönet
                        </Link>
                    </div>

                    <p className="mt-6 text-xs text-neutral-500">
                        Toplam {stats.total} eser kayıtlı.
                    </p>
                </>
            )}
        </div>
    );
}

const ACCENT_CLASSES: Record<string, string> = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    neutral: 'text-neutral-900',
};

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className={`mt-1 text-2xl font-semibold ${ACCENT_CLASSES[accent]}`}>
                {value.toLocaleString('tr-TR')}
            </div>
        </div>
    );
}

// Uc renkli oran cubugu — kutuphane YOK, saf flex + yuzde genislik.
// Payda uc durumun toplami (yukarida acikladi: total edge-case'i onlemek icin).
function StatusBar({ published, queued, draft }: { published: number; queued: number; draft: number }) {
    const sum = published + queued + draft;
    if (sum === 0) return null;
    const pct = (n: number) => `${(n / sum) * 100}%`;

    return (
        <div className="mt-3">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="bg-emerald-500" style={{ width: pct(published) }} title={`Yayında: ${published}`} />
                <div className="bg-amber-500" style={{ width: pct(queued) }} title={`Kuyrukta: ${queued}`} />
                <div className="bg-neutral-300" style={{ width: pct(draft) }} title={`Taslak: ${draft}`} />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-neutral-500">
                <LegendDot className="bg-emerald-500" label={`Yayında %${Math.round((published / sum) * 100)}`} />
                <LegendDot className="bg-amber-500" label={`Kuyrukta %${Math.round((queued / sum) * 100)}`} />
                <LegendDot className="bg-neutral-300" label={`Taslak %${Math.round((draft / sum) * 100)}`} />
            </div>
        </div>
    );
}

function LegendDot({ className, label }: { className: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
            {label}
        </span>
    );
}

// queueEndsAt'e kalan gun sayisi. null/gecmis → null (gosterilmez).
function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const target = new Date(iso).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return null;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}