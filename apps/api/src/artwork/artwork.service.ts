import {
    Injectable, NotFoundException, ConflictException, Logger
} from '@nestjs/common';
import { Prisma, Artwork, Artist } from '@dia/database/generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { QueryArtworkDto } from './dto/query-artwork.dto';
import { RedisService } from '../redis/redis.service';

type ArtworkWithArtist = Artwork & { artist: Artist };

// findAll artist'in sadece 3 alanını seçiyor → tip de onu yansıtsın
type FeedArtwork = Artwork & { artist: Pick<Artist, 'id' | 'name' | 'slug'> };

type FeedResult = {
    items: FeedArtwork[];
    meta: { page: number; limit: number; total: number; pages: number };
};

@Injectable()
export class ArtworkService {
    private readonly logger = new Logger(ArtworkService.name);

    constructor(private prisma: PrismaService, private redis: RedisService) { }

    private slugify(input: string): string {
        return input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Türkçe karakter kaybını önlemek istersen ayrı map yaz
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
    }

    async create(dto: CreateArtworkDto) {
        const artist = await this.prisma.artist.findUnique({ where: { id: dto.artistId } });
        if (!artist) throw new NotFoundException('Sanatçı bulunamadı');

        const base = dto.title ? this.slugify(dto.title) : 'eser';
        const slug = `${base}-${Date.now().toString(36)}`;

        try {
            const created = await this.prisma.artwork.create({
                data: {
                    ...dto,
                    slug,
                    colorPalette: dto.colorPalette ?? Prisma.JsonNull,
                },
            });
            await this.invalidateArtworkCache(); // ← yeni eser → feed/daily bayat
            return created;
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    async findAll(query: QueryArtworkDto) {
        const { page = 1, limit = 20, type, script, artistId, q } = query;

        const cacheable = !q;
        const cacheKey = this.buildFeedKey(query);

        if (cacheable) {
            const cached = await this.redis.get<FeedResult>(cacheKey);
            if (cached) {
                this.logger.log(`feed cache HIT: ${cacheKey}`);
                return cached;
            }
            this.logger.log(`feed cache MISS: ${cacheKey}`);
        }

        const where: Prisma.ArtworkWhereInput = {
            isPublished: true,
            ...(type && { type }),
            ...(script && { script }),
            ...(artistId && { artistId }),
            ...(q && {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { arabicText: { contains: q, mode: 'insensitive' } },
                    { translation: { contains: q, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.artwork.findMany({
                where,
                include: { artist: { select: { id: true, name: true, slug: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.artwork.count({ where }),
        ]);

        const result: FeedResult = { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
        
        if (cacheable) {
            await this.redis.set(cacheKey, result, 300);
        }

        return result;
    }

    // --- GÜN 5: Günün Eseri Mantığı ---
    async findDaily() {
        const cacheKey = `artworks:daily:${this.getTodayKey()}`;

        // 1. Önce cache'e bak
        const cached = await this.redis.get<ArtworkWithArtist>(cacheKey); // Veya varsa özel Artwork tipin
        if (cached) {
            this.logger.log(`daily cache HIT: ${cacheKey}`);
            return cached;
        }
        this.logger.log(`daily cache MISS: ${cacheKey}`);

        // --- DÜZELTME BURADA: Tipi açıkça belirttik ---
        // 'any' yerine projenin artwork tipi neyse onu yazabilirsin, 
        // örneğin: 'let artwork: any = null;'
        let artwork: ArtworkWithArtist | null = null;

        // 1) Bugün manuel olarak featured var mı?
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        const manualFeatured = await this.prisma.artwork.findFirst({
            where: {
                isPublished: true,
                featuredAt: { gte: startOfToday, lt: startOfTomorrow },
            },
            orderBy: { featuredAt: 'desc' },
            include: { artist: true },
        });

        if (manualFeatured) {
            artwork = manualFeatured; // Artık hata vermeyecek
        } else {
            // 2) Fallback: tarihe göre deterministik seçim
            const total = await this.prisma.artwork.count({
                where: { isPublished: true },
            });

            if (total === 0) throw new NotFoundException('Yayında eser yok');

            const dayOfYear = this.getDayOfYear(new Date());
            const index = dayOfYear % total;

            const [daily] = await this.prisma.artwork.findMany({
                where: { isPublished: true },
                orderBy: { createdAt: 'asc' },
                skip: index,
                take: 1,
                include: { artist: true },
            });

            artwork = daily; // Artık hata vermeyecek
        }

        // 3. Sonucu cache'e yaz
        if (artwork) {
            await this.redis.set(cacheKey, artwork, this.secondsUntilEndOfDay());
        }

        return artwork;
    }
    // ----------------------------------

    async findOneBySlug(slug: string) {
        const artwork = await this.prisma.artwork.findUnique({
            where: { slug },
            include: { artist: true },
        });
        if (!artwork) throw new NotFoundException('Eser bulunamadı');
        return artwork;
    }

    async update(id: string, dto: UpdateArtworkDto) {
        await this.ensureExists(id);
        try {
            const updated = await this.prisma.artwork.update({ where: { id }, data: dto });
            await this.invalidateArtworkCache(); // ← featuredAt/içerik değişmiş olabilir
            return updated;
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    async remove(id: string) {
        await this.ensureExists(id);
        try {
            await this.prisma.artwork.delete({ where: { id } });
            await this.invalidateArtworkCache(); // ← eser silindi → feed/daily bayat
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    // ── ortak yardımcılar ──

    // Yılın kaçıncı günü (1-366) - GÜN 5 Fallback Yardımcısı
    private getDayOfYear(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    private async ensureExists(id: string) {
        const found = await this.prisma.artwork.findUnique({ where: { id } });
        if (!found) throw new NotFoundException('Eser bulunamadı');
    }

    private handlePrismaError(e: unknown): never {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') throw new ConflictException('Bu slug zaten kullanılıyor');
            if (e.code === 'P2003') throw new ConflictException('Bu esere bağlı bağlantılar (koleksiyon/beğeni) var, önce onları silmelisiniz');
        }
        throw e;
    }

    /** "2026-07-02" formatında bugünün tarihi (yerel saat). */
    private getTodayKey(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** Bugünün sonuna (23:59:59) kalan saniye. */
    private secondsUntilEndOfDay(): number {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
    }

    private buildFeedKey(query: QueryArtworkDto): string {
        // Gelen query boş olsa bile varsayılan değerlerle sabit bir yapı oluşturuyoruz
        const { type = '', script = '', artistId = '', page = 1, limit = 20 } = query;

        // Alanlar HEP aynı sırada — deterministik key garantisi
        return `artworks:feed:type=${type}|script=${script}|artistId=${artistId}|page=${page}|limit=${limit}`;
    }

    /** Artwork verisi değişince feed + daily cache'ini temizler. */
    private async invalidateArtworkCache(): Promise<void> {
        await Promise.all([
            this.redis.delByPattern('artworks:feed:*'),
            this.redis.delByPattern('artworks:daily:*'),
        ]);
        this.logger.log('Artwork cache invalidated (feed + daily)');
    }
}