'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { AuthService } from '@/lib/auth/authService';

export default function AdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await AuthService.logout();
    router.replace('/login');
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">DIA Admin Panel</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Çıkış
            </button>
          </div>
          <p className="text-gray-600">
            Giriş başarılı. Eser ve sanatçı yönetimi buraya gelecek.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}