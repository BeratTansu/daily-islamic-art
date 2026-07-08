// packages/database/scripts/import-metadata.ts
import { PrismaClient } from '../generated/client/index.js'; // ← seed'indeki import ile AYNI olsun
import * as XLSX from 'xlsx';
import path from 'node:path';

const prisma = new PrismaClient();



// Türkçe karakter map'li slugify (Hamid Aytaç → hamid-aytac)
const TR: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};
function slugify(input: string): string {
    return input
        .split('').map((c) => TR[c] ?? c).join('')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-+)|(-+$)/g, '');
}

// boş/whitespace → null (Samet'in "olmayanı boş bırak" kuralı)
function clean(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

type Row = {
    artwork_id: string | number | null;
    sanatci: string | null;
    transkripsiyon: string | null;
    meaning: string | null;
    surah: string | null;
};

function cleanNames(fullName: string | null): string[] {
    if (!fullName) return [];
    return fullName
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && n.toLocaleLowerCase('tr').replace(/\s+/g, ' ') !== 'imzasız');
}

// İlk ismi Artist'e upsert et, id döndür. sanatci boşsa "İsimsiz Sanatçı"ya bağla.
async function upsertArtist(names: string[]): Promise<string> {
    const name = names[0] ?? 'İsimsiz Sanatçı';
    const slug = slugify(name) || 'isimsiz-sanatci';
    const artist = await prisma.artist.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
    });
    return artist.id;
}

async function main() {
    const file = process.argv[2];
    if (!file) throw new Error('Kullanım: pnpm tsx scripts/import-metadata.ts <excel-yolu>');

    const wb = XLSX.readFile(path.resolve(file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });

    let skipped = 0;
    for (const [i, row] of rows.entries()) {
        const sourceId = clean(row.artwork_id);
        if (!sourceId) { skipped++; continue; }

        const names = cleanNames(row.sanatci);              // ← "İmzasız" ayıklanmış liste
        const artistId = await upsertArtist(names);         // ← artık ismleri geçiyoruz

        const metadata = {                                  // ← YENİ HALİ (eskisinin yerine)
            artistId,
            contributors: names.length > 0 ? names.join(', ') : null,
            transcription: clean(row.transkripsiyon),
            translation: clean(row.meaning),
            sourceRef: clean(row.surah),
            type: 'DIGER' as const,
        };

        await prisma.artwork.upsert({
            where: { sourceId },
            create: {
                sourceId,
                slug: `${sourceId}`,   // ← senin düzenlediğin format neyse o kalsın
                isPublished: false,
                ...metadata,
            },
            update: { ...metadata },
        });

        if ((i + 1) % 200 === 0) console.log(`İşlenen: ${i + 1}/${rows.length}`);
    }

    const total = await prisma.artwork.count({ where: { sourceId: { not: null } } });
    console.log(`\nBitti. Excel satırı: ${rows.length}, atlanan (id yok): ${skipped}, DB'deki import eseri: ${total}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());