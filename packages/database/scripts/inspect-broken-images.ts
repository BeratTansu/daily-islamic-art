import { PrismaClient } from '../generated/client/index.js';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();

// Backfill sirasinda thumb'i anormal kucuk cikan eserler (23/07 tespiti).
// 9004 DB'de yok (listede hata veya silinmis) — 19 kayit var.
const SUSPECT_IDS = [
    '8383', '8385', '8199', '7852', '7875', '7627', '5085', '5300',
    '5133', '5126', '3798', '3649', '3398', '3356', '3895', '2917',
    '2907', '2906', '2391', '2334',
];

async function main() {
    const rows = await prisma.artwork.findMany({
        where: { sourceId: { in: SUSPECT_IDS } },
        select: {
            sourceId: true,
            slug: true,
            imageUrl: true,
            thumbUrl: true,
            isPublished: true,
            artist: { select: { name: true } },
        },
        orderBy: { sourceId: 'asc' },
    });

    const cards = rows
        .map(
            (a) => `
    <div class="card">
      <img src="${a.thumbUrl}" loading="lazy" />
      <div class="meta">
        <strong>${a.sourceId}</strong>
        <span>${a.artist?.name ?? '-'}</span>
        <span class="${a.isPublished ? 'pub' : 'draft'}">
          ${a.isPublished ? 'YAYINDA' : 'taslak'}
        </span>
        <a href="${a.imageUrl}" target="_blank">orijinal</a>
      </div>
    </div>`,
        )
        .join('\n');

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Supheli gorseller</title>
<style>
  body { font-family: system-ui; background: #222; color: #eee; padding: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .card { background: #333; border-radius: 8px; overflow: hidden; }
  .card img { width: 100%; height: 220px; object-fit: contain; background: #111; display: block; }
  .meta { padding: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .pub { color: #6f6; } .draft { color: #999; }
  a { color: #8bf; }
</style></head>
<body>
  <h1>Supheli gorseller (${rows.length} kayit)</h1>
  <p>Bozuk/bos olanlari not al, sonra unpublish/sil karari verilecek.</p>
  <div class="grid">${cards}</div>
</body></html>`;

    const out = 'suspect-images.html';
    writeFileSync(out, html, 'utf-8');
    console.log(`Yazildi: ${out}`);
    console.log(`Tarayicida ac: packages/database/${out}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());