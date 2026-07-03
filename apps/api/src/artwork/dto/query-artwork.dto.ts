import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ArtworkType } from '@dia/database/generated/client/index.js';

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
}