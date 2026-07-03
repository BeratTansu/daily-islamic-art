import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3001', // web admin paneli
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // DTO'da tanımsız alanları temizle
      forbidNonWhitelisted: true, // fazladan alan gelirse 400 dön
      transform: true,            // payload'ı DTO class instance'ına çevir
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();