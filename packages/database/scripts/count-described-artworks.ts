// Kuru sayım — HİÇBİR ŞEY DEĞİŞTİRMEZ. Açıklamalı/açıklamasız eser dağılımını sayar.
// "Açıklamalı" = description VEYA translation VEYA transcription'dan en az biri DOLU.
// "Dolu" = null değil VE trim'lenince boş değil (boş string açıklamasız sayılır).
// Çalıştır: pnpm --filter @dia/database exec tsx scripts/count-described-artworks.ts
// (runner: tsx — düz Prisma, DI yok)
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

// Bir alan "dolu" mu? (null değil + trim boş değil)
function dolu(v: string | null): boolean {
    return v !== null && v.trim() !== '';
}

// Bir eser açıklamalı mı? (üç alandan en az biri dolu)
function aciklamali(a: { description: string | null; translation: string | null; transcription: string | null }): boolean {
    return dolu(a.description) || dolu(a.translation) || dolu(a.transcription);
}

async function main() {
    // TÜM eserleri çek — sadece kararı etkileyen alanlar (dar select).
    // NOT: Prisma where'de trim yapamayız (boş string'i null gibi sayamayız),
    // o yüzden HEPSİNİ çekip JS'te dolu() ile eleriz. Doğru sonuç için tek yol bu.
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

    const toplam = all.length;
    const acikli = all.filter(aciklamali);
    const aciksiz = all.filter((a) => !aciklamali(a));

    // Yayın durumu kırılımı
    const yayinda = all.filter((a) => a.isPublished);
    const yayindaAcikli = yayinda.filter(aciklamali);
    const yayindaAciksiz = yayinda.filter((a) => !aciklamali(a));

    // Açıklamalı ama yayında OLMAYAN (yayına alınabilecek havuz)
    const acikliYayindaDegil = acikli.filter((a) => !a.isPublished);

    // Sanatçı kapsamı — açıklamalı eserler kaç FARKLI sanatçıya ait?
    // (curation "sanatçı başına 1" mantığındaysa bu kritik.)
    const acikliSanatcilar = new Set(acikli.map((a) => a.artistId).filter(Boolean));
    const yayindaAcikliSanatcilar = new Set(yayindaAcikli.map((a) => a.artistId).filter(Boolean));
    const toplamSanatci = await prisma.artist.count();

    // Hangi alan ne kadar katkı sağlıyor (teşhis — kararı etkileyebilir)
    const sadeceDescription = all.filter((a) => dolu(a.description)).length;
    const sadeceTranslation = all.filter((a) => dolu(a.translation)).length;
    const sadeceTranscription = all.filter((a) => dolu(a.transcription)).length;

    console.log(`\n═══ GENEL ═══`);
    console.log(`Toplam eser:            ${toplam}`);
    console.log(`Açıklamalı:             ${acikli.length}`);
    console.log(`Açıklamasız:            ${aciksiz.length}`);

    console.log(`\n═══ ALAN KATKISI (çakışabilir) ═══`);
    console.log(`description dolu:        ${sadeceDescription}`);
    console.log(`translation dolu:       ${sadeceTranslation}`);
    console.log(`transcription dolu:     ${sadeceTranscription}`);

    console.log(`\n═══ YAYIN DURUMU (şu an) ═══`);
    console.log(`Yayında (toplam):       ${yayinda.length}`);
    console.log(`  ├─ açıklamalı:        ${yayindaAcikli.length}`);
    console.log(`  └─ açıklamasız:       ${yayindaAciksiz.length}  ← yayından kalkabilecekler`);

    console.log(`\n═══ YAYIN HAVUZU POTANSİYELİ ═══`);
    console.log(`Açıklamalı, yayında değil: ${acikliYayindaDegil.length}  ← yayına alınabilecekler`);

    console.log(`\n═══ SANATÇI KAPSAMI ═══`);
    console.log(`Toplam sanatçı:              ${toplamSanatci}`);
    console.log(`Açıklamalı eseri olan:       ${acikliSanatcilar.size}`);
    console.log(`Şu an yayında + açıklamalı:  ${yayindaAcikliSanatcilar.size}`);
    console.log(``);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());