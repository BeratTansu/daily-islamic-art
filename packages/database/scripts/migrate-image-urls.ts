import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

const OLD = 'https://pub-1820554986fc4118abcfafb522689454.r2.dev';
const NEW = 'https://dia-cdn.tnsup.app';

async function main() {
    const rows = await prisma.artwork.findMany({
        where: { imageUrl: { startsWith: OLD } },
        select: { id: true, imageUrl: true },
    });

    console.log(`${rows.length} eser güncellenecek`);

    let done = 0;
    for (const r of rows) {
        await prisma.artwork.update({
            where: { id: r.id },
            data: { imageUrl: r.imageUrl!.replace(OLD, NEW) },
        });
        done++;
        if (done % 200 === 0) console.log(`  ${done}/${rows.length}`);
    }

    console.log(`bitti: ${done} eser`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());