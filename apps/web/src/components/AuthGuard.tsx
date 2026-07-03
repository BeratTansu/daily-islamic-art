'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth/authService';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!AuthService.isLoggedIn()) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  // Kontrol bitene kadar içeriği gösterme (flash önleme).
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Yükleniyor...
      </div>
    );
  }

  return <>{children}</>;
}