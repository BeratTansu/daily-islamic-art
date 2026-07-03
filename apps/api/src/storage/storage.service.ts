import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicUrl: string;

    constructor(private readonly config: ConfigService) {
        const accountId = this.config.get<string>('R2_ACCOUNT_ID');
        const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
        this.bucket = this.config.get<string>('R2_BUCKET_NAME')!;
        this.publicUrl = this.config.get<string>('R2_PUBLIC_URL')!;

        if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
            throw new Error(
                'R2 credentials eksik — StorageService başlatılamadı. .env kontrol et.',
            );
        }

        this.client = new S3Client({
            region: 'auto', // R2 için sabit 'auto'
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });

        this.logger.log(`StorageService hazır (bucket: ${this.bucket})`);
    }

    // upload / delete / extFromMime AYNEN kalıyor — değişiklik yok

    /**
     * Bir dosyayı R2'ye yükler, public URL döner.
     * @param buffer dosya içeriği
     * @param mimeType örn "image/jpeg"
     * @param folder bucket içi klasör, örn "artworks"
     */
    async upload(
        buffer: Buffer,
        mimeType: string,
        folder = 'artworks',
    ): Promise<string> {
        const ext = this.extFromMime(mimeType);
        const key = `${folder}/${randomUUID()}${ext}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            }),
        );

        // public URL: R2.dev subdomain + key
        return `${this.publicUrl}/${key}`;
    }

    /**
     * Public URL'den key çıkarıp dosyayı siler.
     */
    async delete(publicUrl: string): Promise<void> {
        const key = publicUrl.replace(`${this.publicUrl}/`, '');
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    private extFromMime(mimeType: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
        };
        return map[mimeType] ?? '';
    }
}