// Test sanatcisi kalmis mi? (read-only)
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

const PATTERNS = ['messi', 'test', 'berat', 'deneme'];

async function main() {
    const rows = await prisma.artist.findMany({
        where: {
            OR: PATTERNS.map((p) => ({
                name: { contains: p, mode: 'insensitive' as const },
            })),
        },
        select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { artworks: true } },
        },
        orderBy: { name: 'asc' },
    });

    console.log(`\nSupheli sanatci: ${rows.length}\n`);
    for (const a of rows) {
        console.log(`${a.name} | slug: ${a.slug} | eser: ${a._count.artworks}`);
    }
    if (rows.length === 0) {
        console.log('Temiz.');
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());