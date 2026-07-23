// apps/api/scripts/backfill-thumbnails.ts
//
// Mevcut eserler icin thumbnail uretir (imageUrl var, thumbUrl null).
// Idempotent: thumbUrl dolu olanlari atlar, kaldigi yerden devam eder.
//
// Calistir (ONCE TEST):
//   cd apps/api
//   npx ts-node -r tsconfig-paths/register scripts/backfill-thumbnails.ts 10
// Tamami:
//   npx ts-node -r tsconfig-paths/register scripts/backfill-thumbnails.ts 3065
//
// Arguman verilmezse LIMIT = 0 (guvenli default, hicbir sey yapmaz).

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import {
    ImageProcessingService,
    THUMB_MIME,
    THUMB_EXT,
} from '../src/storage/image-processing.service';

/**
 * "https://cdn.../artworks/abc-123.jpg" → "abc-123"
 * Thumb key'i ayni UUID'yi paylasir → eslesme takip edilebilir.
 */
function extractBaseName(imageUrl: string): string | null {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return null;
    const dot = fileName.lastIndexOf('.');
    return dot === -1 ? fileName : fileName.slice(0, dot);
}

async function main() {
    const limit = parseInt(process.argv[2] ?? '0', 10);
    if (!Number.isFinite(limit) || limit <= 0) {
        console.log('LIMIT verilmedi. Kullanim: ... backfill-thumbnails.ts <adet> [--published]');
        return;
    }

    // --published: sadece yayindaki eserler (kullanicinin GORDUGU 200 eser once).
    // Backfill uzun surer; feed hemen hizlansin diye once bunlar islenir.
    const onlyPublished = process.argv.includes('--published');

    // --force-large: sharp pixel limitini kapatir (asiri buyuk cozunurluklu eserler icin).
    // Bilincli/gecici — kaynak bizim import ettigimiz dosyalar.
    const forceLarge = process.argv.includes('--force-large');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    const prisma = app.get(PrismaService);
    const storage = app.get(StorageService);
    const imaging = app.get(ImageProcessingService);

    const targets = await prisma.artwork.findMany({
        where: {
            imageUrl: { not: null },
            thumbUrl: null,
            ...(onlyPublished ? { isPublished: true } : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit,
        select: { id: true, slug: true, imageUrl: true },
    });

    console.log('Mod:', onlyPublished ? 'SADECE YAYINDAKILER' : 'TUMU', forceLarge ? '| pixel limit KAPALI' : '');
    console.log('Islenecek eser sayisi:', targets.length);
    if (targets.length === 0) {
        console.log('Islenecek eser yok. Cikiliyor.');
        await app.close();
        return;
    }

    let ok = 0;
    let fail = 0;
    let totalOriginal = 0;
    let totalThumb = 0;

    for (const [i, art] of targets.entries()) {
        const label = `[${i + 1}/${targets.length}] ${art.slug}`;
        try {
            const baseName = extractBaseName(art.imageUrl!);
            if (!baseName) throw new Error('imageUrl parse edilemedi: ' + art.imageUrl);

            // 1. Orijinali CDN'den indir
            const res = await fetch(art.imageUrl!);
            if (!res.ok) throw new Error(`indirme basarisiz: HTTP ${res.status}`);
            const original = Buffer.from(await res.arrayBuffer());

            // 2. Thumbnail uret
            const thumb = await imaging.createThumbnail(original, forceLarge);

            // 3. R2'ye yaz (ayni UUID, thumbs/ klasoru)
            const thumbKey = `artworks/thumbs/${baseName}${THUMB_EXT}`;
            const thumbUrl = await storage.upload(thumb, THUMB_MIME, 'artworks', thumbKey);

            // 4. DB'ye yaz
            await prisma.artwork.update({
                where: { id: art.id },
                data: { thumbUrl },
            });

            totalOriginal += original.length;
            totalThumb += thumb.length;
            ok++;

            const kb = (n: number) => Math.round(n / 1024);
            console.log(`${label} OK  ${kb(original.length)}KB -> ${kb(thumb.length)}KB`);
        } catch (e) {
            fail++;
            console.error(`${label} HATA:`, (e as Error).message);
        }
    }

    const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
    console.log('---');
    console.log('Basarili:', ok, '| Hatali:', fail);
    console.log(`Toplam orijinal: ${mb(totalOriginal)}MB -> thumb: ${mb(totalThumb)}MB`);
    if (totalThumb > 0) {
        console.log('Kazanc orani:', (totalOriginal / totalThumb).toFixed(1) + 'x');
    }

    await app.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});