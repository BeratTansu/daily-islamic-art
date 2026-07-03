import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { StorageModule } from '../src/storage/storage.module';
import { StorageService } from '../src/storage/storage.service';

// Odaklanmış smoke test için izole root module.
// Sadece StorageModule (+ ConfigModule) — Redis, Prisma, Auth devre dışı.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../.env'), // scripts/ -> apps/api/.env
    }),
    StorageModule,
  ],
})
class StorageSmokeTestModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(
    StorageSmokeTestModule,
    { logger: ['error', 'warn', 'log'] },
  );

  const storage = app.get(StorageService);
  const buffer = Buffer.from('DIA R2 smoke test - ' + new Date().toISOString());

  console.log('Yükleniyor...');
  const url = await storage.upload(buffer, 'image/png', 'smoke-test');
  console.log('✅ Yüklendi. Public URL:');
  console.log(url);

  await app.close();
}

main().catch((err) => {
  console.error('❌ Smoke test başarısız:');
  console.error(err);
  process.exit(1);
});