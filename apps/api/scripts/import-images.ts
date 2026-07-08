// apps/api/scripts/import-images.ts
import { NestFactory } from '@nestjs/core';
import { readFileSync, readdirSync } from 'node:fs';
import { join, parse } from 'node:path';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/storage/storage.service';
import { PrismaService } from '../src/prisma/prisma.service'; // ← path'i kendi yapına göre doğrula

const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

async function main() {
    const imagesDir = process.argv[2];
    const limit = process.argv[3] ? Number(process.argv[3]) : undefined;
    if (!imagesDir) {
        throw new Error('Kullanım: pnpm ts-node scripts/import-images.ts <görsel-klasörü> [limit]');
    }

    // Klasörü bir kez tara → sourceId -> dosyaAdı map'i (uzantı agnostik)
    const fileMap = new Map<string, string>();
    for (const f of readdirSync(imagesDir)) {
        const { name, ext } = parse(f); // "8483.jpg" -> name:"8483", ext:".jpg"
        if (MIME[ext.toLowerCase()]) fileMap.set(name, f);
    }
    console.log(`Klasörde ${fileMap.size} görsel bulundu.`);

    // HTTP açmadan DI container'ı kur (sadece error/warn logu)
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });
    const storage = app.get(StorageService);
    const prisma = app.get(PrismaService);

    // Sadece görseli henüz yüklenmemiş import eserleri (idempotency)
    const pending = await prisma.artwork.findMany({
        where: { sourceId: { not: null }, imageUrl: null },
        select: { id: true, sourceId: true },
        ...(limit ? { take: limit } : {}),
    });
    console.log(`Görsel bekleyen eser: ${pending.length}${limit ? ` (limit: ${limit})` : ''}\n`);

    let uploaded = 0;
    let missing = 0;
    let failed = 0;
    const missingIds: string[] = [];

    for (const [i, art] of pending.entries()) {
        const sourceId = art.sourceId!;
        const fileName = fileMap.get(sourceId);

        if (!fileName) {
            missing++;
            missingIds.push(sourceId);
            continue;
        }

        try {
            const ext = parse(fileName).ext.toLowerCase();
            const buffer = readFileSync(join(imagesDir, fileName));
            const url = await storage.upload(buffer, MIME[ext], 'artworks');

            await prisma.artwork.update({
                where: { id: art.id },
                // Görsel R2'ye yüklendi → imageUrl dolar. AMA isPublished'e DOKUNMUYORUZ.
                // Kürasyon kararı manuel: eserleri panelden biz tek tek yayına alacağız.
                // (Önceki hali isPublished:true idi — otomatik yayın kürasyon mantığıyla çelişiyordu.)
                data: { imageUrl: url },
            });

            uploaded++;
            if (uploaded % 50 === 0) console.log(`Yüklenen: ${uploaded}`);
        } catch (err) {
            failed++;
            console.error(`HATA (sourceId=${sourceId}):`, (err as Error).message);
        }
    }

    console.log(`\n─── Özet ───`);
    console.log(`Yüklendi:        ${uploaded}`);
    console.log(`Dosyası yok:     ${missing}`);
    console.log(`Hata:            ${failed}`);
    if (missingIds.length) {
        console.log(`\nDosyası bulunamayan id'ler (ilk 20): ${missingIds.slice(0, 20).join(', ')}`);
    }

    await app.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});