// Kuru sayım — HİÇBİR ŞEY SİLMEZ. Sadece çöp hesapların bağlı kayıtlarını sayar.
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/count-junk-users.ts
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

// Silinecek çöp hesaplar — TAM liste, körlemesine LIKE yok.
const JUNK_EMAILS = [
    'test@test.com',
    'test2@test.com',
    'admin@dia.app',
    'Berat@dia.app',
    'Deneme@dia.app',
    'Deneme1@dia.app',
    'Deneme2@dia.app',
    'Samet@dia.app',
];

async function main() {
    const users = await prisma.user.findMany({
        where: { email: { in: JUNK_EMAILS } },
        select: { id: true, email: true },
    });

    console.log(`\nBulunan çöp hesap: ${users.length} / ${JUNK_EMAILS.length}\n`);

    // Listede olup DB'de bulunmayan varsa uyar (email yazımı farklı olabilir).
    const foundEmails = new Set(users.map((u) => u.email));
    const missing = JUNK_EMAILS.filter((e) => !foundEmails.has(e));
    if (missing.length > 0) {
        console.log(`⚠️  DB'de bulunamayan (email yazımını kontrol et): ${missing.join(', ')}\n`);
    }

    let totalLikes = 0;
    let totalCollections = 0;
    let totalItems = 0;

    for (const u of users) {
        const likeCount = await prisma.like.count({ where: { userId: u.id } });

        const collections = await prisma.collection.findMany({
            where: { userId: u.id },
            select: { id: true },
        });
        const collectionIds = collections.map((c) => c.id);

        const itemCount =
            collectionIds.length > 0
                ? await prisma.collectionItem.count({
                      where: { collectionId: { in: collectionIds } },
                  })
                : 0;

        totalLikes += likeCount;
        totalCollections += collections.length;
        totalItems += itemCount;

        console.log(
            `${u.email.padEnd(22)} → ${likeCount} like, ${collections.length} koleksiyon, ${itemCount} item`,
        );
    }

    console.log(`\n─── TOPLAM ───`);
    console.log(`Silinecek: ${users.length} User, ${totalLikes} Like, ${totalCollections} Collection, ${totalItems} CollectionItem\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());