import { IsBoolean } from 'class-validator';

export class PublishArtworkDto {
    @IsBoolean()
    published: boolean;
}