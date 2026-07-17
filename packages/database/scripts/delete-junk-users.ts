// Çöp hesap temizliği — GERİ DÖNÜŞÜ YOK. count:junk ile önce doğrulandı.
// Silme sırası cascade YOK olduğu için elle: CollectionItem → Collection → Like → User.
// Çalıştır: pnpm --filter @dia/database run delete:junk
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

// count-junk-users.ts ile AYNI liste olmalı. Değiştirirsen ikisini birlikte güncelle.
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

    if (users.length !== JUNK_EMAILS.length) {
        console.error(
            `⚠️  Beklenen ${JUNK_EMAILS.length} hesap, bulunan ${users.length}. ` +
            `Güvenlik için DURUYORUM — count:junk ile kontrol et.`,
        );
        process.exit(1);
    }

    const userIds = users.map((u) => u.id);

    // Tek transaction: hepsi başarılı olur ya da hiçbiri (kısmi silme yok).
    const result = await prisma.$transaction(async (tx) => {
        // 1. En derin: bu kullanıcıların koleksiyonlarındaki item'lar
        const collections = await tx.collection.findMany({
            where: { userId: { in: userIds } },
            select: { id: true },
        });
        const collectionIds = collections.map((c) => c.id);

        const items =
            collectionIds.length > 0
                ? await tx.collectionItem.deleteMany({
                      where: { collectionId: { in: collectionIds } },
                  })
                : { count: 0 };

        // 2. Koleksiyonlar
        const cols = await tx.collection.deleteMany({
            where: { userId: { in: userIds } },
        });

        // 3. Like'lar
        const likes = await tx.like.deleteMany({
            where: { userId: { in: userIds } },
        });

        // 4. En son: User'lar
        const usr = await tx.user.deleteMany({
            where: { id: { in: userIds } },
        });

        return { items: items.count, cols: cols.count, likes: likes.count, usr: usr.count };
    });

    console.log(`\n✓ Silindi:`);
    console.log(`  CollectionItem: ${result.items}`);
    console.log(`  Collection:     ${result.cols}`);
    console.log(`  Like:           ${result.likes}`);
    console.log(`  User:           ${result.usr}\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
    