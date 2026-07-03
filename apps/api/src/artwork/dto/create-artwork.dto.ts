import {
    IsString, IsOptional, IsBoolean, IsEnum, IsUrl, IsObject, MaxLength,
} from 'class-validator';
import { ArtworkType } from '@dia/database/generated/client/index.js';
import { Prisma } from '@dia/database/generated/client/index.js';

export class CreateArtworkDto {
    @IsString()
    artistId: string;

    @IsEnum(ArtworkType)
    type: ArtworkType;

    @IsUrl()
    imageUrl: string;

    @IsOptional() @IsString() @MaxLength(200)
    title?: string;

    @IsOptional() @IsString()
    script?: string; // sülüs, nesih, divani...

    @IsOptional() @IsString()
    period?: string;

    @IsOptional() @IsString()
    medium?: string;

    @IsOptional() @IsString()
    dimensions?: string;

    @IsOptional() @IsString()
    arabicText?: string;

    @IsOptional() @IsString()
    translation?: string;

    @IsOptional() @IsString()
    sourceRef?: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsUrl()
    thumbUrl?: string;

    @IsOptional() @IsObject()
    colorPalette?: Prisma.InputJsonValue; // JSONB

    @IsOptional() @IsBoolean()
    isPublished?: boolean;
}