// Rezerv havuzdan (translation dolu, publishAt: null, isPublished: false) siradaki
// eserlere ardisik TR-00:00 publishAt atar + isPublished: true yapar (yayin kuyruguna al).
//
// Formul: baslangic = max(sistemdeki en ileri publishAt, bugun) + 1 gun.
//   - Rezerv doluysa: en ileri gelecekte → kuyruk kesintisiz uzar.
//   - Rezerv bittiyse (en ileri gecmis): bugun devreye girer → patlama yok, akis bugunden temiz devam.
//
// Siralama: createdAt asc (FIFO — havuza gelis sirasi), tie-breaker id asc.
//
// Calistir (once test): pnpm --filter @dia/database exec tsx scripts/enqueue-publish.ts 3
//          (tamami):    pnpm --filter @dia/database exec tsx scripts/enqueue-publish.ts 246
// Arguman verilmezse LIMIT = 0 (hicbir sey yapmaz, guvenli default).

import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

/**
 * Bir Date'i, ait oldugu TAKVIM GUNUNUN TR-00:00'ina sabitler.
 * TR = UTC+3 sabit (DST yok). TR-00:00 = UTC onceki gun 21:00.
 * Girdi olarak bir "TR gun" veririz (yil/ay/gun), UTC instant doner.
 */
function trMidnightUtc(year: number, month: number, day: number): Date {
  // month 1-12 (insan), Date.UTC 0-11 bekler → month-1.
  // TR 00:00 = UTC 21:00 (onceki gun). Date.UTC ile UTC 21:00'i kurmak icin:
  // o gunun UTC 00:00'indan 3 saat GERI = onceki gun UTC 21:00.
  return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
}

/**
 * Bir Date'in TR takvimindeki (yil, ay, gun) degerini verir.
 * UTC instant'i TR'ye (+3) cevirip parcalar.
 */
function toTrParts(d: Date): { year: number; month: number; day: number } {
  const tr = new Date(d.getTime() + 3 * 60 * 60 * 1000); // +3 saat = TR yerel
  return {
    year: tr.getUTCFullYear(),
    month: tr.getUTCMonth() + 1,
    day: tr.getUTCDate(),
  };
}

async function main() {
  const limit = parseInt(process.argv[2] ?? '0', 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    console.log('LIMIT verilmedi veya 0. Kullanim: ... enqueue-publish.ts <adet>');
    return;
  }

  // 1. Sistemdeki en ileri publishAt (kuyrugun sonu)
  const last = await prisma.artwork.findFirst({
    where: { publishAt: { not: null } },
    orderBy: { publishAt: 'desc' },
    select: { publishAt: true },
  });
  const lastPublishAt = last?.publishAt ?? null;

  // 2. Bugunun TR-00:00'i (referans tabani icin)
  const nowTr = toTrParts(new Date());
  const todayTrMidnight = trMidnightUtc(nowTr.year, nowTr.month, nowTr.day);

  // 3. Baslangic tabani = max(en ileri, bugun). +1 gun asagida dongude eklenir.
  //    (en ileri null ise → bugun. gecmisse → bugun. gelecekse → en ileri.)
  const base =
    lastPublishAt && lastPublishAt.getTime() > todayTrMidnight.getTime()
      ? lastPublishAt
      : todayTrMidnight;

  const baseTr = toTrParts(base);
  console.log('En ileri publishAt (UTC):', lastPublishAt?.toISOString() ?? 'YOK');
  console.log('Bugun TR-00:00 (UTC):', todayTrMidnight.toISOString());
  console.log('Baslangic tabani (UTC):', base.toISOString(), '→ TR gun:', baseTr);

  // 4. Rezervden siradaki N eseri cek (FIFO)
  const reserve = await prisma.artwork.findMany({
    where: { publishAt: null, isPublished: false, translation: { not: null } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true, slug: true },
  });
  console.log('Kuyruga alinacak eser sayisi:', reserve.length);
  if (reserve.length === 0) {
    console.log('Rezervde eser yok. Cikiliyor.');
    return;
  }

  // 5. Her esere base'den itibaren +1, +2, +3... gun ata (TR-00:00)
  //    $transaction — hepsi ya da hicbiri (yarim kuyruk olmasin).
  const updates = reserve.map((art, i) => {
    // base'in TR gununu al, i+1 gun ekle, tekrar TR-00:00'a sabitle
    const targetTr = toTrParts(base);
    const targetMidnight = trMidnightUtc(
      targetTr.year,
      targetTr.month,
      targetTr.day + (i + 1), // Date.UTC gun tasmasini otomatik yonetir (ay/yil gecisi)
    );
    return { art, publishAt: targetMidnight };
  });

  // Onizleme (ilk 5 + son 1)
  console.log('--- Onizleme (ilk 5) ---');
  updates.slice(0, 5).forEach((u) =>
    console.log(u.art.slug, '→', u.publishAt.toISOString(), '(TR:', toTrParts(u.publishAt), ')'),
  );
  if (updates.length > 5) {
    const lastU = updates[updates.length - 1];
    console.log('...');
    console.log('SON:', lastU.art.slug, '→', lastU.publishAt.toISOString());
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.artwork.update({
        where: { id: u.art.id },
        data: { publishAt: u.publishAt, isPublished: true },
      }),
    ),
  );
  console.log('TAMAM. Kuyruga alindi:', updates.length, 'eser.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });