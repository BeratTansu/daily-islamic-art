import AuthGuard from '@/components/AuthGuard';
import { AdminNav } from '@/components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <AdminNav />
                <main>{children}</main>
            </div>
        </AuthGuard>
    );
}