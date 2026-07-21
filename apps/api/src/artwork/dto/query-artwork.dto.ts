import { IsBoolean, IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ArtworkType } from '@dia/database/generated/client/index.js';

// Feed siralama secenekleri. Prisma enum'u DEGIL — DB'de sort alani yok,
// bu bir API sozlesmesi (query param). O yuzden burada tanimli.
export enum ArtworkSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_LIKED = 'mostLiked',
  SHUFFLE = 'shuffle',
}

// Feed/filtre için. Query param'lar string gelir → @Type ile number'a çevir.
export class QueryArtworkDto {
  @IsOptional() @IsEnum(ArtworkType)
  type?: ArtworkType;

  @IsOptional() @IsString()
  script?: string;

  @IsOptional() @IsString()
  artistId?: string;

  @IsOptional() @IsString()
  q?: string; // arama

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  // Pull-to-refresh sinyali: true ise cache OKUMASI atlanir, DB'den taze cekilir.
  // buildFeedKey'e GIRMEZ (key kirlenmesin) — sadece cache-read kararinda kullanilir.
  // @Type(() => Boolean) YANLIS olur (her string true olur) → elle Transform sart.
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  refresh?: boolean;

  // Siralama. Default newest (mevcut davranis) service'te uygulanir.
  @IsOptional()
  @IsEnum(ArtworkSort)
  sort?: ArtworkSort;

  // Shuffle seed'i. SADECE sort=shuffle ile anlamli. Client uretir, oturum boyu
  // sabit tutar → sayfalama tutarli (ayni seed = ayni hash sirasi). Number:
  // client Math.random()/Date.now() uretir, string'e gomulur ama int guvenli.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seed?: number;
}