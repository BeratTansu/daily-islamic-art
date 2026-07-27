import { redirect } from 'next/navigation';

// Kok URL (/) → /admin'e yonlendir. /admin layout'unda AuthGuard var:
// giris yoksa login'e atar, varsa dashboard'i gosterir.
// Server-side redirect → placeholder flash yok, sayfa hic render olmaz.
export default function Home() {
  redirect('/admin');
}