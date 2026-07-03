import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { Logger } from '@nestjs/common';

// AWS SDK'yı komple mock'la: S3Client bağlantı kurmaz,
// command constructor'ları argümanları yakalamamız için mock olur.
jest.mock('@aws-sdk/client-s3');

// randomUUID'i sabitle → key'i tam string assert edebilelim.
jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    randomUUID: jest.fn(() => 'fixed-uuid-1234'),
}));

// Sahte config değerleri — tek yerden yönetilsin.
const FAKE_CONFIG: Record<string, string> = {
    R2_ACCOUNT_ID: 'acc-123',
    R2_ACCESS_KEY_ID: 'key-123',
    R2_SECRET_ACCESS_KEY: 'secret-123',
    R2_BUCKET_NAME: 'dia-artworks',
    R2_PUBLIC_URL: 'https://pub-test.r2.dev',
};

// ConfigService'i taklit eden minimal fake. get(key) → FAKE_CONFIG[key].
function makeConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
    const values = { ...FAKE_CONFIG, ...overrides };
    return {
        get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
}

describe('StorageService', () => {
    let service: StorageService;
    let sendMock: jest.Mock;
    let loggerSpy: jest.SpyInstance;

    beforeAll(() => {
        // Tüm testler başlamadan önce Logger'ı sustur (konsol kirliliğini önler)
        loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    afterAll(() => {
        // Testler bittikten sonra Logger'ı eski haline getir (diğer test dosyalarını etkilemez)
        loggerSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        service = new StorageService(makeConfig());

        // Mock'lanmış S3Client instance'ının send'ini yakala.
        // service.client private olduğu için any ile erişiyoruz (test içi, kabul edilebilir).
        sendMock = (service as any).client.send as jest.Mock;
        sendMock.mockResolvedValue({}); // send başarılı dönsün
    });

    describe('constructor / fail-fast', () => {
        it('geçerli credential ile başlar', () => {
            expect(() => new StorageService(makeConfig())).not.toThrow();
        });

        it('accountId eksikse throw eder', () => {
            expect(() => new StorageService(makeConfig({ R2_ACCOUNT_ID: undefined }))).toThrow(
                /R2 credentials eksik/,
            );
        });

        it('bucket eksikse throw eder', () => {
            expect(() => new StorageService(makeConfig({ R2_BUCKET_NAME: undefined }))).toThrow(
                /R2 credentials eksik/,
            );
        });
    });

    describe('upload', () => {
        it('doğru key üretir (folder/uuid.ext) ve public URL döner', async () => {
            const buffer = Buffer.from('fake-image');
            const url = await service.upload(buffer, 'image/jpeg', 'artworks');

            expect(url).toBe('https://pub-test.r2.dev/artworks/fixed-uuid-1234.jpg');
        });

        it('varsayılan folder "artworks" kullanır', async () => {
            const url = await service.upload(Buffer.from('x'), 'image/png');

            expect(url).toBe('https://pub-test.r2.dev/artworks/fixed-uuid-1234.png');
        });

        it('PutObjectCommand doğru parametrelerle kurulur', async () => {
            const buffer = Buffer.from('fake-image');
            await service.upload(buffer, 'image/webp', 'avatars');

            expect(PutObjectCommand).toHaveBeenCalledTimes(1);
            expect(PutObjectCommand).toHaveBeenCalledWith({
                Bucket: 'dia-artworks',
                Key: 'avatars/fixed-uuid-1234.webp',
                Body: buffer,
                ContentType: 'image/webp',
            });
        });

        it('client.send tam 1 kez çağrılır', async () => {
            await service.upload(Buffer.from('x'), 'image/png');
            expect(sendMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('extFromMime (upload üzerinden)', () => {
        // Private metod ama davranışını upload'ın ürettiği key üzerinden test ediyoruz.
        const cases: Array<[string, string]> = [
            ['image/jpeg', '.jpg'],
            ['image/png', '.png'],
            ['image/webp', '.webp'],
            ['image/gif', '.gif'],
        ];

        it.each(cases)('%s → %s uzantısı', async (mime, ext) => {
            const url = await service.upload(Buffer.from('x'), mime);
            expect(url).toBe(`https://pub-test.r2.dev/artworks/fixed-uuid-1234${ext}`);
        });

        it('bilinmeyen mime → uzantısız key', async () => {
            const url = await service.upload(Buffer.from('x'), 'application/octet-stream');
            expect(url).toBe('https://pub-test.r2.dev/artworks/fixed-uuid-1234');
        });
    });

    describe('delete', () => {
        it('public URL\'den doğru key çıkarır', async () => {
            await service.delete('https://pub-test.r2.dev/artworks/fixed-uuid-1234.jpg');

            expect(DeleteObjectCommand).toHaveBeenCalledWith({
                Bucket: 'dia-artworks',
                Key: 'artworks/fixed-uuid-1234.jpg',
            });
        });

        it('client.send tam 1 kez çağrılır', async () => {
            await service.delete('https://pub-test.r2.dev/artworks/x.png');
            expect(sendMock).toHaveBeenCalledTimes(1);
        });
    });
});