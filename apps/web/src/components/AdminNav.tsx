'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth/authService';

// Nav item'lari tek kaynak — yeni sayfa eklenince buraya bir satir.
const NAV_ITEMS = [
    { href: '/admin/artworks', label: 'Eserler' },
    { href: '/admin/artists', label: 'Sanatçılar' },
];

export function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await AuthService.logout();
        router.replace('/login');
    }

    return (
        <header className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
                <Link href="/admin" className="text-sm font-semibold tracking-tight">
                    DIA Yönetim
                </Link>

                <nav className="flex gap-1">
                    {NAV_ITEMS.map((item) => {
                        // startsWith: /admin/artworks/new ve /admin/artworks/[slug]/edit
                        // altindayken de "Eserler" aktif gorunsun.
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={
                                    active
                                        ? 'rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900'
                                        : 'rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50'
                                }
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="ml-auto text-sm text-neutral-500 hover:text-neutral-900"
                >
                    Çıkış
                </button>
            </div>
        </header>
    );
}