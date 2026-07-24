// Test verisi tespiti (read-only). Silme YOK.
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

// Elle olusturulan test eserlerinin slug desenleri.
const PATTERNS = ['berat-tansu', 'eser-', 'lionel-messi'];

async function main() {
    const rows = await prisma.artwork.findMany({
        where: {
            OR: [
                ...PATTERNS.map((p) => ({ slug: { contains: p } })),
                { title: { contains: 'messi', mode: 'insensitive' as const } },
                { title: { contains: 'test', mode: 'insensitive' as const } },
                { title: { contains: 'berat', mode: 'insensitive' as const } },
                { artist: { name: { contains: 'messi', mode: 'insensitive' as const } } },
                { artist: { name: { contains: 'test', mode: 'insensitive' as const } } },
            ],
        },
        select: {
            id: true,
            slug: true,
            sourceId: true,
            isPublished: true,
            publishAt: true,
            imageUrl: true,
            artist: { select: { name: true } },
            _count: { select: { likes: true, inCollections: true } },
        },
        orderBy: { slug: 'asc' },
    });

    console.log(`\nTest eseri adaylari: ${rows.length}\n`);
    for (const a of rows) {
        console.log(`${a.slug}`);
        console.log(`   sourceId: ${a.sourceId ?? 'YOK'} | ${a.isPublished ? 'YAYINDA' : 'taslak'} | publishAt: ${a.publishAt?.toISOString() ?? 'null'}`);
        console.log(`   sanatci: ${a.artist?.name ?? '-'}`);
        console.log(`   like: ${a._count.likes} | koleksiyon: ${a._count.inCollections}`);
        console.log(`   img: ${a.imageUrl}`);
        console.log('');
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());