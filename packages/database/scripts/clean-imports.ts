import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Excel\'den gelen eski kayıtlar siliniyor...');
  
  const result = await prisma.artwork.deleteMany({
    where: { sourceId: { not: null } }
  });

  console.log(`Tertemiz oldu! Silinen eser sayısı: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());