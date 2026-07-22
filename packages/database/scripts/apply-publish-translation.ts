// YAYIN UYGULA (yeni kürasyon — Samet 22/07) — isPublished GÜNCELLER (geri alınabilir).
// KURAL: öncelik translation dolu (katman 1), bitince transcription dolu (katman 2).
//   Katman 1: translation dolu (transcription farketmez)
//   Katman 2: translation boş ama transcription dolu
//   Katman 3: sadece description
// SIFIRLA + YENİDEN KUR: önce TÜM yayını kaldırır, sonra katman sırasıyla hedef kadar publish eder.
// Sıra: katman (1→2→3) → id (deterministik tie-breaker).
// Önce mevcut yayın durumunu yedekler (geri dönüş için).
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/apply-publish-translation.ts [hedef]
//   hedef verilmezse 200.
// ⚠️ isPublished değişince Redis FLUSHALL şart: docker exec dia_redis redis-cli FLUSHALL
// ⚠️ PRE-LAUNCH GÜVENLİ: unpublish edilen eserin like/collection etkisi canlıda düşünülmeli
//    (unpublish olan eser beğeni listesinden düşer + koleksiyonda gizlenir). Canlıda tekrarlama.
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();

function dolu(v: string | null): boolean {
    return v !== null && v.trim() !== '';
}

// Bir eser hangi öncelik katmanına düşer? (0 = açıklamasız, yayına GİRMEZ)
// count-curation-priority.ts'teki katman() ile BİREBİR AYNI.
function katman(a: { description: string | null; translation: string | null; transcription: string | null }): 1 | 2 | 3 | 0 {
    if (dolu(a.translation)) return 1;
    if (dolu(a.transcription)) return 2;
    if (dolu(a.description)) return 3;
    return 0;
}

async function main() {
    const hedef = Number(process.argv[2] ?? 200);
    if (!Number.isInteger(hedef) || hedef < 1) {
        throw new Error(`Geçersiz hedef: ${process.argv[2]}`);
    }

    const all = await prisma.artwork.findMany({
        select: {
            id: true, isPublished: true,
            description: true, translation: true, transcription: true,
        },
    });

    // ─── YEDEK: mevcut yayın durumu (geri dönüş için) ───
    const oncekiYayinda = all.filter((a) => a.isPublished).map((a) => a.id);
    const yedekDosya = `backup-published-${Date.now()}.json`;
    writeFileSync(yedekDosya, JSON.stringify(oncekiYayinda, null, 2), 'utf-8');
    console.log(`\n📦 Yedek yazıldı: ${yedekDosya} (${oncekiYayinda.length} eser ID)`);

    // ─── SEÇİM: katman sırasıyla hedef kadar (SIFIRDAN, mevcut yayını yok say) ───
    // Adaylar = açıklaması olan (katman > 0) tüm eserler. Yayın durumuna BAKMA — sıfırla+yeniden kur.
    const adaylar = all
        .map((a) => ({ id: a.id, tier: katman(a) }))
        .filter((a) => a.tier > 0);

    // Sırala: önce katman (1→2→3), eşitlikte id (deterministik).
    adaylar.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.id.localeCompare(b.id);
    });

    const secilen = adaylar.slice(0, hedef);
    const secilenIdler = secilen.map((a) => a.id);

    // Teşhis: seçilenlerin katman kırılımı
    const secT1 = secilen.filter((a) => a.tier === 1).length;
    const secT2 = secilen.filter((a) => a.tier === 2).length;
    const secT3 = secilen.filter((a) => a.tier === 3).length;
    console.log(`\nSeçim (hedef ${hedef}): ${secilen.length} eser`);
    console.log(`  ├─ Katman 1 (translation):  ${secT1}`);
    console.log(`  ├─ Katman 2 (transcription): ${secT2}`);
    console.log(`  └─ Katman 3 (description):   ${secT3}`);
    if (secilen.length < hedef) {
        console.log(`⚠️  Havuz yetersiz: ${secilen.length}/${hedef} (açıklamalı eser bitti).`);
    }

    // ─── UYGULA: tek transaction — önce HEPSİNİ kaldır, sonra seçilenleri publish et ───
    await prisma.$transaction([
        // 1) Sıfırla: tüm yayını kaldır.
        prisma.artwork.updateMany({
            where: { isPublished: true },
            data: { isPublished: false },
        }),
        // 2) Yeniden kur: seçilen 200'ü publish et.
        prisma.artwork.updateMany({
            where: { id: { in: secilenIdler } },
            data: { isPublished: true },
        }),
    ]);

    // ─── DOĞRULAMA ───
    const sonYayinda = await prisma.artwork.count({ where: { isPublished: true } });
    console.log(`\n✅ Bitti. Yayında: ${sonYayinda}`);
    if (sonYayinda !== secilen.length) {
        console.log(`⚠️  Beklenen ${secilen.length} ama ${sonYayinda} — kontrol et.`);
    }
    console.log(`\n⚠️  Redis temizle: docker exec dia_redis redis-cli FLUSHALL`);
    console.log(`(Geri dönüş: ${yedekDosya} içindeki ID'leri true yap, gerisini false.)\n`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());