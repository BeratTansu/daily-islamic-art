import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { QueryArtworkDto } from './query-artwork.dto';

// Admin panel durum filtresi. Prisma enum'u DEGIL — DB'de status alani yok.
// isPublished + publishAt'ten TURETILIR (ArtworkSort gibi API sozlesmesi enum'u):
//   published = isPublished:true AND publishAt <= now  (sirasi gelmis, yayinda)
//   queued    = isPublished:true AND publishAt >  now  (onayli ama sirasi gelmemis)
//   draft     = isPublished:false                       (admin onaylamamis)
export enum AdminArtworkStatus {
    PUBLISHED = 'published',
    QUEUED = 'queued',
    DRAFT = 'draft',
}

export class QueryAdminArtworkDto extends QueryArtworkDto {
    // Uclu durum filtresi. Panel rozetiyle (yayinda/kuyrukta/taslak) birebir eslesir.
    // Verilirse isPublished/hasImage'a gerek kalmaz (status ikisini kapsar).
    @IsOptional()
    @IsEnum(AdminArtworkStatus)
    status?: AdminArtworkStatus;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isPublished?: boolean;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    hasImage?: boolean;
}