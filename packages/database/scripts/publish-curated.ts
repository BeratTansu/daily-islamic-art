import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

const TARGET = 200;

async function main() {
    // Sanatçı başına 1 eser: distinct artistId, en eski kayıt
    const candidates = await prisma.artwork.findMany({
        where: {
            sourceId: { not: null },   // sadece import eserleri (seed'e dokunma)
            imageUrl: { not: null },   // görselsiz yayına giremez
            isPublished: false,
        },
        distinct: ['artistId'],
        orderBy: { createdAt: 'asc' },
        take: TARGET,
        select: { id: true, slug: true, artistId: true },
    });

    console.log(`${candidates.length} aday seçildi (hedef ${TARGET})`);

    const result = await prisma.artwork.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { isPublished: true },
    });

    console.log(`${result.count} eser yayına alındı`);

    const total = await prisma.artwork.count({ where: { isPublished: true } });
    console.log(`toplam yayında: ${total}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());