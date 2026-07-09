import { PrismaClient, ArtworkType } from '../generated/client/index.js';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// CRUD service'indekiyle BİREBİR AYNI olmalı — farklıysa kendi versiyonunla değiştir.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─────────── SANATÇILAR ───────────
const artists = [
  {
    slug: 'seyh-hamdullah',
    name: 'Şeyh Hamdullah',
    bio: 'Osmanlı hat sanatının kurucu ustalarından, "kıble-i küttab" (hattatların kıblesi) olarak anılır. Aklâm-ı sitte üslubunu olgunlaştırdı.',
    era: 'Osmanlı (15-16. yy)',
    country: 'Türkiye',
    isContemporary: false,
  },
  {
    slug: 'hafiz-osman',
    name: 'Hâfız Osman',
    bio: 'Klasik Osmanlı hattının zirvesi kabul edilen hattat. Mushaf yazımında bir standart oluşturdu, sülüs ve nesihte çığır açtı.',
    era: 'Osmanlı (17. yy)',
    country: 'Türkiye',
    isContemporary: false,
  },
  {
    slug: 'ahmed-karahisari',
    name: 'Ahmed Karahisârî',
    bio: 'Kanuni döneminin büyük hattatı. Kendine has "Karahisârî üslubu" ile tanınır, celî sülüsün ustası.',
    era: 'Osmanlı (16. yy)',
    country: 'Türkiye',
    isContemporary: false,
  },
  {
    slug: 'mustafa-rakim',
    name: 'Mustafa Râkım',
    bio: 'Celî sülüs ve tuğra sanatında reform yapan hattat. II. Mahmud döneminin baş hattatı.',
    era: 'Osmanlı (18-19. yy)',
    country: 'Türkiye',
    isContemporary: false,
  },
  {
    slug: 'fatih-ozkafa',
    name: 'Fatih Özkafa',
    bio: 'Çağdaş Türk hattat ve akademisyen. Klasik hat geleneğini modern kompozisyonlarla buluşturur.',
    era: 'Çağdaş',
    country: 'Türkiye',
    isContemporary: true,
  },
];

// ─────────── ESERLER ───────────
// artistSlug ile sanatçıya bağlanır (aşağıda id'ye çevrilir).
const artworks = [
  // — Şeyh Hamdullah —
  {
    slug: 'besmele-sulus-seyh-hamdullah',
    title: 'Besmele (Sülüs)',
    artistSlug: 'seyh-hamdullah',
    type: ArtworkType.HAT,
    script: 'sülüs',
    period: '1500 civarı',
    medium: 'kâğıt üzerine is mürekkebi',
    arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translation: 'Rahman ve Rahim olan Allah’ın adıyla.',
    sourceRef: 'Besmele',
    description: 'Klasik sülüs hattıyla yazılmış besmele kompozisyonu.',
    featured: true, // ← günün eseri
  },
  {
    slug: 'ayetel-kursi-nesih-seyh-hamdullah',
    title: 'Âyetü’l-Kürsî (Nesih)',
    artistSlug: 'seyh-hamdullah',
    type: ArtworkType.HAT,
    script: 'nesih',
    period: '1500 civarı',
    medium: 'kâğıt üzerine mürekkep',
    arabicText: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    translation: 'Allah, kendisinden başka hiçbir ilah olmayandır. Diridir, kayyumdur.',
    sourceRef: 'Bakara 255',
    description: 'Nesih hattıyla Âyetü’l-Kürsî.',
  },
  // — Hâfız Osman —
  {
    slug: 'hilye-i-serif-hafiz-osman',
    title: 'Hilye-i Şerîf',
    artistSlug: 'hafiz-osman',
    type: ArtworkType.HAT,
    script: 'sülüs-nesih',
    period: '1690 civarı',
    medium: 'kâğıt, altın, tezhipli',
    arabicText: 'مُحَمَّدٌ رَسُولُ اللَّهِ',
    translation: 'Muhammed Allah’ın elçisidir.',
    sourceRef: 'Hilye',
    description: 'Hâfız Osman’ın standartlaştırdığı hilye formu.',
  },
  {
    slug: 'sure-fatiha-nesih-hafiz-osman',
    title: 'Fâtiha Sûresi (Nesih)',
    artistSlug: 'hafiz-osman',
    type: ArtworkType.HAT,
    script: 'nesih',
    period: '1680 civarı',
    medium: 'kâğıt üzerine mürekkep',
    arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    translation: 'Hamd, âlemlerin Rabbi Allah’a mahsustur.',
    sourceRef: 'Fâtiha 2',
    description: 'Mushaf nesihiyle Fâtiha açılışı.',
  },
  // — Ahmed Karahisârî —
  {
    slug: 'celi-sulus-karahisari',
    title: 'Celî Sülüs Levha',
    artistSlug: 'ahmed-karahisari',
    type: ArtworkType.HAT,
    script: 'celî sülüs',
    period: '1550 civarı',
    medium: 'kâğıt, altın',
    arabicText: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',
    translation: 'Allah, göklerin ve yerin nurudur.',
    sourceRef: 'Nûr 35',
    description: 'Karahisârî üslubuyla celî sülüs.',
  },
  {
    slug: 'mushaf-sayfasi-karahisari',
    title: 'Mushaf Sayfası',
    artistSlug: 'ahmed-karahisari',
    type: ArtworkType.TEZHIP,
    script: 'nesih',
    period: '1546',
    medium: 'kâğıt, altın, tezhip',
    arabicText: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
    translation: 'Şüphesiz biz sana Kevser’i verdik.',
    sourceRef: 'Kevser 1',
    description: 'Tezhipli mushaf sayfası kompozisyonu.',
  },
  // — Mustafa Râkım —
  {
    slug: 'tugra-mustafa-rakim',
    title: 'Tuğra Kompozisyonu',
    artistSlug: 'mustafa-rakim',
    type: ArtworkType.HAT,
    script: 'tuğrakeş',
    period: '1810 civarı',
    medium: 'kâğıt, altın',
    arabicText: 'محمود خان بن عبد الحميد مظفر دائما',
    translation: 'II. Mahmud Han bin Abdülhamid, daima muzaffer.',
    sourceRef: 'Tuğra',
    description: 'Râkım’ın reforme ettiği tuğra estetiği.',
  },
  {
    slug: 'celi-sulus-levha-rakim',
    title: 'Celî Sülüs Levha',
    artistSlug: 'mustafa-rakim',
    type: ArtworkType.HAT,
    script: 'celî sülüs',
    period: '1815 civarı',
    medium: 'kâğıt, altın',
    arabicText: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ',
    translation: 'Başarım ancak Allah’ın yardımıyladır.',
    sourceRef: 'Hûd 88',
    description: 'Olgun celî sülüs örneği.',
  },
  // — Fatih Özkafa (çağdaş) —
  {
    slug: 'muhabbet-celi-divani-ozkafa',
    title: 'Muhabbet (Celî Divânî)',
    artistSlug: 'fatih-ozkafa',
    type: ArtworkType.HAT,
    script: 'divani',
    period: '2015',
    medium: 'kâğıt üzerine mürekkep',
    arabicText: 'المحبة',
    translation: 'Muhabbet / sevgi.',
    sourceRef: 'Kelime',
    description: 'Çağdaş divânî kompozisyon.',
  },
  {
    slug: 'talik-kita-ozkafa',
    title: 'Ta’lik Kıt’a',
    artistSlug: 'fatih-ozkafa',
    type: ArtworkType.HAT,
    script: 'talik',
    period: '2018',
    medium: 'kâğıt üzerine mürekkep',
    arabicText: 'العلم نور',
    translation: 'İlim nurdur.',
    sourceRef: 'Vecize',
    description: 'Ta’lik hattıyla kıt’a.',
  },
];

// picsum placeholder — Gün 6'da R2 URL'leriyle değişecek.
function placeholderImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/1080/1920`;
}

async function main() {
  console.log('🌱 Seed başlıyor...');

  const passwordHash = await argon2.hash('User123!');

  await prisma.user.upsert({
    where: { email: 'user@dia.app' },
    update: {passwordHash},
    create: {
      email: 'user@dia.app',
      passwordHash,
      displayName: 'Test Kullanıcı',
      role: 'USER',
    },
  });

  console.log('✓ Test user: user@dia.app');

  // 1) Sanatçıları upsert et, slug → id map'i oluştur.
  const artistIdBySlug = new Map<string, string>();
  for (const a of artists) {
    const artist = await prisma.artist.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        bio: a.bio,
        era: a.era,
        country: a.country,
        isContemporary: a.isContemporary,
      },
      create: a,
    });
    artistIdBySlug.set(a.slug, artist.id);
    console.log(`  👤 Sanatçı: ${artist.name}`);
  }

  // 2) Eserleri upsert et (FK: artistId map'ten).
  for (const w of artworks) {
    const artistId = artistIdBySlug.get(w.artistSlug);
    if (!artistId) {
      throw new Error(`Sanatçı bulunamadı: ${w.artistSlug} (eser: ${w.slug})`);
    }

    const data = {
      title: w.title,
      artistId,
      type: w.type,
      script: w.script,
      period: w.period,
      medium: w.medium,
      arabicText: w.arabicText,
      translation: w.translation,
      sourceRef: w.sourceRef,
      description: w.description,
      imageUrl: placeholderImage(w.slug),
      thumbUrl: placeholderImage(w.slug),
      isPublished: true,
      featuredAt: w.featured ? new Date() : null,
    };

    await prisma.artwork.upsert({
      where: { slug: w.slug },
      update: data,
      create: { slug: w.slug, ...data },
    });
    console.log(`  🖼️  Eser: ${w.title}`);
  }

  console.log('✅ Seed tamamlandı.');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });