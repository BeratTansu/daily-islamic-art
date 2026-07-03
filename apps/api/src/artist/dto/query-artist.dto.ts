import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryArtistDto {
  @IsOptional() @IsString()
  q?: string; // İsimde arama yapmak için (Örn: "Osman")

  @IsOptional() @IsString()
  era?: string; // Döneme göre filtreleme (Örn: "Osmanlı")

  @IsOptional() @IsString()
  country?: string; // Ülkeye göre filtreleme

  // Query parametreleri string geldiği için boolean'a çeviriyoruz
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isContemporary?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;
}