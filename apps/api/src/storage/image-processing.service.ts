import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

/** Thumbnail uretim parametreleri — tek kaynak. */
export const THUMB_WIDTH = 900;
export const THUMB_QUALITY = 82;
export const THUMB_MIME = 'image/webp';
export const THUMB_EXT = '.webp';

@Injectable()
export class ImageProcessingService {
    private readonly logger = new Logger(ImageProcessingService.name);

    /**
     * Orijinal gorselden feed/grid icin thumbnail uretir.
     * Saf: Buffer girer, Buffer cikar. Ag/DB bilmez.
     *
     * .rotate() — EXIF orientation uygular (yan yatik kaynaklar duzelir).
     * withoutEnlargement — kaynak THUMB_WIDTH'ten kucukse BUYUTME.
     */
    /**
     * allowHugeInput: sharp'in decompression-bomb korumasini (varsayilan ~268MP)
     * kapatir. SADECE backfill gibi kaynagi bilinen toplu islerde kullanilir —
     * upload endpoint'inde ASLA acilmaz (disaridan dosya kabul ediyor).
     */
    async createThumbnail(input: Buffer, allowHugeInput = false): Promise<Buffer> {
        return sharp(input, allowHugeInput ? { limitInputPixels: false } : undefined)
            .rotate()
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: THUMB_QUALITY })
            .toBuffer();
    }

    async getMetadata(input: Buffer): Promise<{ width?: number; height?: number }> {
        const meta = await sharp(input).metadata();
        return { width: meta.width, height: meta.height };
    }
}