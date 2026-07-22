// Rezerv havuzunun isPublished dagilimini kontrol eder (read-only).
// Calistir: pnpm --filter @dia/database exec tsx scripts/check-reserve.ts

import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const dist = await prisma.artwork.groupBy({
    by: ['isPublished'],
    where: { publishAt: null, translation: { not: null } },
    _count: true,
  });
  console.log('publishAt:null + translation dolu, isPublished dagilimi:');
  console.log(dist);

  const totalReserve = await prisma.artwork.count({
    where: { publishAt: null, translation: { not: null } },
  });
  console.log('Toplam rezerv (translation dolu, kuyruga alinmamis):', totalReserve);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });