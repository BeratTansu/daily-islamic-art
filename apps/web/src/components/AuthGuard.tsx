'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth/authService';
import { AUTH_LOGOUT_EVENT } from '@/lib/auth/authStorage';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Mount'ta ilk kontrol (mevcut mantık).
  useEffect(() => {
    if (!AuthService.isLoggedIn()) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  // Sayfa açıkken auth düşerse (refresh başarısız → clear) reaktif redirect.
  useEffect(() => {
    const onLogout = () => router.replace('/login');
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Yükleniyor...
      </div>
    );
  }

  return <>{children}</>;
}