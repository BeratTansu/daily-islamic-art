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
                                {stats.queued} eser sırada. Otomatik yayın{' '}
                                <span className="font-medium text-neutral-900">
                                    {formatPublishDate(stats.queueEndsAt)}
                                </span>{' '}
                                tarihine kadar devam ediyor.
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
            <div className={`mt-1 text-2xl font-semibold ${ACCENT_CLASSES[accent]}`}>{value}</div>
        </div>
    );
}