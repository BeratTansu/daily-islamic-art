// Bozuk eserlerden kuyruga/yayina girmis olan var mi? (read-only)
import { PrismaClient } from '../generated/client/index.js';
import { EXCLUDED_SOURCE_IDS } from './_excluded-artworks.js';

const prisma = new PrismaClient();

async function main() {
    const rows = await prisma.artwork.findMany({
        where: { sourceId: { in: [...EXCLUDED_SOURCE_IDS] } },
        select: {
            sourceId: true, slug: true, isPublished: true, publishAt: true,
        },
        orderBy: { sourceId: 'asc' },
    });

    const now = new Date();
    const yayinda = rows.filter((a) => a.isPublished && a.publishAt && a.publishAt <= now);
    const kuyrukta = rows.filter((a) => a.isPublished && a.publishAt && a.publishAt > now);
    const taslak = rows.filter((a) => !a.isPublished);

    console.log(`\nBozuk eser durumu (${rows.length} kayit):`);
    console.log(`  Yayinda:  ${yayinda.length} ${yayinda.length ? '⚠️ TEMIZLENMELI' : '✅'}`);
    console.log(`  Kuyrukta: ${kuyrukta.length} ${kuyrukta.length ? '⚠️ TEMIZLENMELI' : '✅'}`);
    console.log(`  Taslak:   ${taslak.length} ✅`);

    for (const a of [...yayinda, ...kuyrukta]) {
        console.log(`  → ${a.sourceId} | ${a.publishAt?.toISOString()}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());