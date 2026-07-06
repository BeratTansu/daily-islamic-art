'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArtworkForm } from '@/components/ArtworkForm';
import { ArtworkService, type Artwork } from '@/lib/artworks/artworkService';
import { ApiError } from '@/lib/auth/apiClient';

export default function EditArtworkPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [artwork, setArtwork] = useState<Artwork | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        ArtworkService.getBySlug(slug)
            .then(setArtwork)
            .catch((e) =>
                setError(e instanceof ApiError ? e.message : 'Eser yüklenemedi.'),
            )
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <p className="p-6 text-neutral-500">Yükleniyor…</p>;
    if (error) return <p className="p-6 text-red-600">{error}</p>;
    if (!artwork) return null;

    return (
        <ArtworkForm
            mode="edit"
            artworkId={artwork.id}
            initialImageUrl={artwork.imageUrl}
            initial={{
                artistId: artwork.artistId,
                type: artwork.type,
                title: artwork.title ?? '',
                script: artwork.script ?? '',
                period: artwork.period ?? '',
                arabicText: artwork.arabicText ?? '',
                translation: artwork.translation ?? '',
                sourceRef: artwork.sourceRef ?? '',
                description: artwork.description ?? '',
                isPublished: artwork.isPublished,
            }}
        />
    );
}