'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArtistForm } from '@/components/ArtistForm';
import { ArtistService, type Artist } from '@/lib/artists/artistService';
import { ApiError } from '@/lib/auth/apiClient';

export default function EditArtistPage() {
  return (
    <EditArtist />
  );
}

function EditArtist() {
  const params = useParams();
  const slug = params.slug as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ArtistService.getBySlug(slug)
      .then(setArtist)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Sanatçı yüklenemedi.'),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p className="p-6 text-neutral-500">Yükleniyor…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!artist) return null;

  return (
    <ArtistForm
      mode="edit"
      artistId={artist.id}
      initial={{
        name: artist.name,
        bio: artist.bio ?? '',
        era: artist.era ?? '',
        country: artist.country ?? '',
        isContemporary: artist.isContemporary,
      }}
    />
  );
}