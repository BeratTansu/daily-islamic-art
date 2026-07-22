// Kuru sayım — HİÇBİR ŞEY DEĞİŞTİRMEZ. Kürasyon ÖNCELİK katmanlarını sayar.
// Yeni kürasyon kuralı (Samet 22/07): "veya veya" DEĞİL, ÖNCELİK SIRASI:
//   Katman 1: translation dolu
//   Katman 2: translation BOŞ ama transcription dolu
//   Katman 3: ikisi de boş ama description dolu
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/count-curation-priority.ts
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

function dolu(v: string | null): boolean {
    return v !== null && v.trim() !== '';
}

type Row = {
    id: string;
    isPublished: boolean;
    artistId: string | null;
    description: string | null;
    translation: string | null;
    transcription: string | null;
};

// Bir eser hangi öncelik katmanına düşer? (0 = hiçbiri = açıklamasız)
function katman(a: Row): 1 | 2 | 3 | 0 {
    if (dolu(a.translation)) return 1;
    if (dolu(a.transcription)) return 2;
    if (dolu(a.description)) return 3;
    return 0;
}

async function main() {
    const all = await prisma.artwork.findMany({
        select: {
            id: true,
            isPublished: true,
            artistId: true,
            description: true,
            translation: true,
            transcription: true,
        },
    });

    // Her esere katmanını ata
    const withTier = all.map((a) => ({ ...a, tier: katman(a) }));

    // Katman bazında sayım (TÜM eserler)
    const t1 = withTier.filter((a) => a.tier === 1);
    const t2 = withTier.filter((a) => a.tier === 2);
    const t3 = withTier.filter((a) => a.tier === 3);
    const t0 = withTier.filter((a) => a.tier === 0);

    // Yayında olanların katman dağılımı — mevcut 200 kürasyona uygun mu?
    const yayinda = withTier.filter((a) => a.isPublished);
    const yT1 = yayinda.filter((a) => a.tier === 1);
    const yT2 = yayinda.filter((a) => a.tier === 2);
    const yT3 = yayinda.filter((a) => a.tier === 3);
    const yT0 = yayinda.filter((a) => a.tier === 0);

    // Yayın havuzu (yayında DEĞİL) katman dağılımı — yeni kürasyonda ne çekebiliriz?
    const havuz = withTier.filter((a) => !a.isPublished);
    const hT1 = havuz.filter((a) => a.tier === 1);
    const hT2 = havuz.filter((a) => a.tier === 2);
    const hT3 = havuz.filter((a) => a.tier === 3);

    console.log(`\n═══ KATMAN DAĞILIMI (tüm eserler) ═══`);
    console.log(`Katman 1 (translation):              ${t1.length}`);
    console.log(`Katman 2 (translation boş, transc.): ${t2.length}`);
    console.log(`Katman 3 (sadece description):       ${t3.length}`);
    console.log(`Katman 0 (açıklamasız):              ${t0.length}`);

    console.log(`\n═══ ŞU AN YAYINDA (200 eser) KATMAN KIRILIMI ═══`);
    console.log(`  Katman 1 (translation):  ${yT1.length}`);
    console.log(`  Katman 2 (transc.):      ${yT2.length}`);
    console.log(`  Katman 3 (description):  ${yT3.length}`);
    console.log(`  Katman 0 (açıklamasız):  ${yT0.length}  ← olmamalı`);

    console.log(`\n═══ YAYIN HAVUZU (yayında değil) — çekilebilir ═══`);
    console.log(`  Katman 1 (translation):  ${hT1.length}  ← yeni kürasyonda ÖNCELİK`);
    console.log(`  Katman 2 (transc.):      ${hT2.length}`);
    console.log(`  Katman 3 (description):  ${hT3.length}`);

    console.log(`\n═══ YENİ KÜRASYON KARARI İÇİN ═══`);
    console.log(`Toplam Katman 1 mevcut:  ${t1.length}  (hedef 200'ü tek başına karşılıyor mu?)`);
    console.log(`Yayındaki Katman 1:      ${yT1.length}  (kaçı zaten yayında?)`);
    console.log(``);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());