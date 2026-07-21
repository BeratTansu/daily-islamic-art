// YAYIN UYGULA — isPublished GÜNCELLER (geri alınabilir: veri silmez).
// plan-publish-described.ts ile AYNI seçim mantığı → plan neyse o uygulanır.
// Önce mevcut yayın durumunu yedek dosyaya yazar (geri dönüş için).
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/apply-publish-described.ts [hedef]
//   hedef verilmezse 200. plan ile AYNI hedefi ver.
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();

function dolu(v: string | null): boolean {
    return v !== null && v.trim() !== '';
}
function aciklamali(a: { description: string | null; translation: string | null; transcription: string | null }): boolean {
    return dolu(a.description) || dolu(a.translation) || dolu(a.transcription);
}

async function main() {
    const hedef = Number(process.argv[2] ?? 200);
    if (!Number.isInteger(hedef) || hedef < 1) {
        throw new Error(`Geçersiz hedef: ${process.argv[2]}`);
    }

    const all = await prisma.artwork.findMany({
        select: {
            id: true, slug: true, isPublished: true, artistId: true,
            description: true, translation: true, transcription: true,
        },
    });

    // ─── YEDEK: mevcut yayın durumu (geri dönüş için) ───
    const oncekiYayinda = all.filter((a) => a.isPublished).map((a) => a.id);
    const yedekDosya = `backup-published-${Date.now()}.json`;
    writeFileSync(yedekDosya, JSON.stringify(oncekiYayinda, null, 2), 'utf-8');
    console.log(`\n📦 Yedek yazıldı: ${yedekDosya} (${oncekiYayinda.length} eser ID)`);

    // ─── SEÇİM (plan ile BİREBİR AYNI mantık) ───
    const kaldirilacak = all.filter((a) => a.isPublished && !aciklamali(a));
    const kalanYayinda = all.filter((a) => a.isPublished && aciklamali(a));
    const adaylar = all.filter((a) => aciklamali(a) && !a.isPublished);

    const eklenecekSayi = Math.max(0, hedef - kalanYayinda.length);
    const temsilEdilen = new Set(kalanYayinda.map((a) => a.artistId).filter(Boolean));
    const sirali = [...adaylar].sort((a, b) => a.slug.localeCompare(b.slug));

    const yeniSanatciEserleri: typeof adaylar = [];
    const tekrarEserleri: typeof adaylar = [];
    const gorulenSanatci = new Set(temsilEdilen);
    for (const a of sirali) {
        if (a.artistId && !gorulenSanatci.has(a.artistId)) {
            yeniSanatciEserleri.push(a);
            gorulenSanatci.add(a.artistId);
        } else {
            tekrarEserleri.push(a);
        }
    }
    const eklenecek = [...yeniSanatciEserleri, ...tekrarEserleri].slice(0, eklenecekSayi);

    console.log(`\nUygulanacak: ${kaldirilacak.length} kaldır, ${eklenecek.length} ekle`);
    console.log(`Sonuç: ${kalanYayinda.length + eklenecek.length} yayında\n`);

    // ─── UYGULA: tek transaction (yarıda kalmasın) ───
    const kaldirIdler = kaldirilacak.map((a) => a.id);
    const ekleIdler = eklenecek.map((a) => a.id);

    await prisma.$transaction([
        prisma.artwork.updateMany({
            where: { id: { in: kaldirIdler } },
            data: { isPublished: false },
        }),
        prisma.artwork.updateMany({
            where: { id: { in: ekleIdler } },
            data: { isPublished: true },
        }),
    ]);

    // ─── DOĞRULAMA: gerçekten hedefe ulaştık mı? ───
    const sonYayinda = await prisma.artwork.count({ where: { isPublished: true } });
    console.log(`✅ Bitti. Yayında: ${sonYayinda}`);
    if (sonYayinda !== kalanYayinda.length + eklenecek.length) {
        console.log(`⚠️  Beklenen ${kalanYayinda.length + eklenecek.length} ama ${sonYayinda} — kontrol et.`);
    }
    console.log(`(Geri dönüş: ${yedekDosya} içindeki ID'leri true yap, gerisini false.)\n`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());