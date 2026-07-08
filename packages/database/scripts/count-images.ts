import { PrismaClient } from '../generated/client/index.js';

const p = new PrismaClient();

async function main() {
    const done = await p.artwork.count({ 
        where: { sourceId: { not: null }, imageUrl: { not: null } } 
    });
    
    const pending = await p.artwork.count({ 
        where: { sourceId: { not: null }, imageUrl: null } 
    });
    
    console.log('Görselli (yayında):', done, '| Bekleyen:', pending);
}

// Fonksiyonu çağır ve işi bitince veritabanı bağlantısını güvenlice kapat
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await p.$disconnect();
    });