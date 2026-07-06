import { IsBoolean } from 'class-validator';

export class FeatureArtworkDto {
    @IsBoolean()
    featured: boolean;
}