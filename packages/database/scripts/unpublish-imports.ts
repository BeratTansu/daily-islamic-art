// packages/database/scripts/unpublish-imports.ts
// Import eserlerini (sourceId dolu) yayından kaldırır — kürasyon sıfırlama.
// Seed eserleri (sourceId: null) etkilenmez.
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.artwork.updateMany({
    where: { sourceId: { not: null } },
    data: { isPublished: false },
  });
  console.log(`Yayından kaldırılan import eseri: ${result.count}`);

  // Doğrulama: kaç import eseri hâlâ yayında?
  const stillPublished = await prisma.artwork.count({
    where: { sourceId: { not: null }, isPublished: true },
  });
  console.log(`Hâlâ yayında olan import eseri: ${stillPublished} (0 olmalı)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());