import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Test için sabit değerler — Adım 1'de her şey hardcoded, sadece sharp'ı doğruluyoruz
const TEST_IMAGE_URL =
  'https://dia-cdn.tnsup.app/artworks/5ddd245c-4de7-4958-a0f7-8f1d6ed39fe2.jpg';

const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 2340;
const BG_CREAM = { r: 245, g: 245, b: 240, alpha: 1 }; // #F5F5F0

async function main() {
  console.log('1) Görsel indiriliyor:', TEST_IMAGE_URL);

  const response = await fetch(TEST_IMAGE_URL);
  if (!response.ok) {
    throw new Error(`Görsel indirilemedi: HTTP ${response.status}`);
  }
  const inputBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`   İndirildi: ${(inputBuffer.length / 1024).toFixed(0)} KB`);

  console.log('2) sharp ile telefon boyuna sığdırılıyor...');

  const outputBuffer = await sharp(inputBuffer)
    .resize(PHONE_WIDTH, PHONE_HEIGHT, {
      fit: 'contain', // eseri KESME, sığdır
      background: BG_CREAM, // boşlukları krem doldur
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log(`   Üretildi: ${(outputBuffer.length / 1024).toFixed(0)} KB`);

  const outputPath = join(process.cwd(), 'wallpaper-test-output.jpg');
  await writeFile(outputPath, outputBuffer);

  console.log('3) Diske yazıldı:', outputPath);
  console.log('   → Bu dosyayı açıp gözünle kontrol et.');
}

main()
  .catch((err) => {
    console.error('HATA:', err);
    process.exit(1);
  });