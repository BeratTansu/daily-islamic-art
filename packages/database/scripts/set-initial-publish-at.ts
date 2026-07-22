// packages/database/scripts/set-initial-publish-at.ts
// Yayındaki (isPublished: true) ve henüz publishAt'i olmayan eserlere
// launch tarihini (TR 00:00) atar. Idempotent: publishAt dolu olanlara dokunmaz.
// Calistir: pnpm --filter @dia/database exec tsx scripts/set-initial-publish-at.ts

import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

// Launch ani: 22 Temmuz 2026, TR 00:00. Acik +03:00 offset = sunucu timezone'undan bagimsiz.
const LAUNCH_AT = new Date('2026-07-22T00:00:00+03:00');

async function main() {
  console.log('LAUNCH_AT (UTC instant):', LAUNCH_AT.toISOString());
  // Beklenen: 2026-07-21T21:00:00.000Z

  const target = await prisma.artwork.findMany({
    where: { isPublished: true, publishAt: null },
    select: { id: true },
  });
  console.log('Guncellenecek eser sayisi:', target.length);
  // Beklenen: 200

  if (target.length === 0) {
    console.log('Guncellenecek eser yok (hepsi zaten tarihli). Cikiliyor.');
    return;
  }

  const result = await prisma.artwork.updateMany({
    where: { isPublished: true, publishAt: null },
    data: { publishAt: LAUNCH_AT },
  });
  console.log('Guncellenen kayit:', result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });