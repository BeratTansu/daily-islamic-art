// YAYIN PLANI (yeni kürasyon — Samet 22/07) — HİÇBİR ŞEY DEĞİŞTİRMEZ (read-only).
// apply-publish-translation.ts ile BİREBİR AYNI seçim mantığı → plan neyse apply onu uygular.
// KURAL: öncelik translation dolu (katman 1), bitince transcription (katman 2), sonra description (3).
// Sıra: katman (1→2→3) → id (deterministik tie-breaker). SIFIRDAN seçer (mevcut yayını yok sayar).
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/plan-publish-translation.ts [hedef]
//   hedef verilmezse 200.
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

function dolu(v: string | null): boolean {
    return v !== null && v.trim() !== '';
}

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

    // apply ile BİREBİR AYNI seçim
    const adaylar = all
        .map((a) => ({ id: a.id, tier: katman(a) }))
        .filter((a) => a.tier > 0);

    adaylar.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.id.localeCompare(b.id);
    });

    const secilen = adaylar.slice(0, hedef);

    const secT1 = secilen.filter((a) => a.tier === 1).length;
    const secT2 = secilen.filter((a) => a.tier === 2).length;
    const secT3 = secilen.filter((a) => a.tier === 3).length;

    // Mevcut yayınla fark — kaç eser değişecek?
    const suAnYayinda = new Set(all.filter((a) => a.isPublished).map((a) => a.id));
    const secilenSet = new Set(secilen.map((a) => a.id));
    const kaldirilacak = [...suAnYayinda].filter((id) => !secilenSet.has(id)).length;
    const eklenecek = [...secilenSet].filter((id) => !suAnYayinda.has(id)).length;
    const kalan = [...secilenSet].filter((id) => suAnYayinda.has(id)).length;

    console.log(`\n═══ PLAN (hedef ${hedef}) — HİÇBİR ŞEY YAZILMADI ═══`);
    console.log(`Seçilecek toplam: ${secilen.length}`);
    console.log(`  ├─ Katman 1 (translation):  ${secT1}`);
    console.log(`  ├─ Katman 2 (transcription): ${secT2}`);
    console.log(`  └─ Katman 3 (description):   ${secT3}`);
    if (secilen.length < hedef) {
        console.log(`⚠️  Havuz yetersiz: ${secilen.length}/${hedef}`);
    }

    console.log(`\n═══ MEVCUT YAYINLA FARK ═══`);
    console.log(`Şu an yayında:     ${suAnYayinda.size}`);
    console.log(`Kalacak (ortak):   ${kalan}`);
    console.log(`Kaldırılacak:      ${kaldirilacak}`);
    console.log(`Yeni eklenecek:    ${eklenecek}`);
    console.log(`\napply ile uygula: pnpm --filter @dia/database exec tsx scripts/apply-publish-translation.ts ${hedef}\n`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());