'use client';

import AuthGuard from '@/components/AuthGuard';
import { ArtistForm } from '@/components/ArtistForm';

export default function NewArtistPage() {
  return (
    <AuthGuard>
      <ArtistForm mode="create" />
    </AuthGuard>
  );
}