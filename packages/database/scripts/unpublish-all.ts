import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
    const r = await prisma.artwork.updateMany({
        where: { isPublished: true },
        data: { isPublished: false },
    });
    console.log(`${r.count} eser yayından kaldırıldı`);

    const total = await prisma.artwork.count({ where: { isPublished: true } });
    console.log(`toplam yayında: ${total}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());