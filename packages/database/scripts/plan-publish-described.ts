// YAYIN PLANI — HİÇBİR ŞEY DEĞİŞTİRMEZ. Sadece "uygulasak ne olurdu" gösterir.
// Strateji: (1) yayındaki açıklamasızları kaldır, (2) açıklamalı havuzdan hedefe kadar ekle.
// Ekleme önceliği: önce temsil edilmeyen sanatçılardan 1'er (çeşitlilik),
//                  havuz yetmezse aynı sanatçılardan ek eser (açıklama > çeşitlilik).
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/plan-publish-described.ts [hedef]
//   hedef verilmezse 200 kabul edilir.
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';

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

    const acikliHavuz = all.filter(aciklamali);

    // 1) KALDIRILACAKLAR: şu an yayında AMA açıklamasız
    const kaldirilacak = all.filter((a) => a.isPublished && !aciklamali(a));

    // Kaldırma sonrası zaten yayında kalanlar (açıklamalı + yayında)
    const kalanYayinda = all.filter((a) => a.isPublished && aciklamali(a));

    // 2) EKLENECEK ADAYLAR: açıklamalı ama yayında değil
    const adaylar = acikliHavuz.filter((a) => !a.isPublished);

    // Hedefe ulaşmak için kaç eser eklenmeli?
    const eklenecekSayi = Math.max(0, hedef - kalanYayinda.length);

    // Halihazırda yayında kalan sanatçılar (çeşitlilik hesabı bunların üstüne)
    const temsilEdilen = new Set(kalanYayinda.map((a) => a.artistId).filter(Boolean));

    // Adayları önceliklendir: önce YENİ sanatçılar (temsil edilmeyen), sonra gerisi.
    // Deterministik olsun diye slug'a göre sırala (aynı sanatçı içinde de stabil).
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

    // Ekleme sırası: önce yeni sanatçılar, sonra tekrarlar. Hedefe kadar kes.
    const eklenecekSirali = [...yeniSanatciEserleri, ...tekrarEserleri].slice(0, eklenecekSayi);

    // Sonuç dağılımı
    const eklenenYeniSanatci = eklenecekSirali.filter((a) => yeniSanatciEserleri.includes(a)).length;
    const eklenenTekrar = eklenecekSirali.length - eklenenYeniSanatci;

    const sonYayinda = kalanYayinda.length + eklenecekSirali.length;
    const sonSanatcilar = new Set([
        ...temsilEdilen,
        ...eklenecekSirali.map((a) => a.artistId).filter(Boolean),
    ]);

    // Sanatçı başına eser sayısı (>1 olan kaç sanatçı?)
    const sonYayindakiIdler = new Set([...kalanYayinda, ...eklenecekSirali].map((a) => a.artistId));
    const sanatciEserSayisi = new Map<string, number>();
    for (const a of [...kalanYayinda, ...eklenecekSirali]) {
        if (a.artistId) sanatciEserSayisi.set(a.artistId, (sanatciEserSayisi.get(a.artistId) ?? 0) + 1);
    }
    const birdenFazla = [...sanatciEserSayisi.values()].filter((n) => n > 1).length;

    console.log(`\n═══ YAYIN PLANI (hedef: ${hedef}) ═══`);
    console.log(`Şu an yayında:                ${all.filter((a) => a.isPublished).length}`);
    console.log(`  ├─ kaldırılacak (açıklamasız): ${kaldirilacak.length}`);
    console.log(`  └─ kalacak (açıklamalı):       ${kalanYayinda.length}`);
    console.log(`\nEklenecek (açıklamalı havuzdan): ${eklenecekSirali.length}`);
    console.log(`  ├─ yeni sanatçıdan:            ${eklenenYeniSanatci}`);
    console.log(`  └─ tekrar sanatçıdan:          ${eklenenTekrar}`);
    console.log(`\nAday havuzu (açıklamalı, yayında değil): ${adaylar.length}`);
    if (eklenecekSayi > adaylar.length) {
        console.log(`⚠️  Hedef ${hedef} için havuz YETMİYOR — max ${kalanYayinda.length + adaylar.length} olabilir.`);
    }

    console.log(`\n═══ SONUÇ (uygulanırsa) ═══`);
    console.log(`Toplam yayında:               ${sonYayinda}`);
    console.log(`Temsil edilen sanatçı:        ${sonSanatcilar.size}`);
    console.log(`Birden fazla eseri olan sanatçı: ${birdenFazla}`);
    console.log(`\n(Bu sadece PLAN — hiçbir şey değişmedi.)\n`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());