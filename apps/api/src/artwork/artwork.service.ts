import {
    Injectable, NotFoundException, ConflictException, Logger
} from '@nestjs/common';
import { Prisma, Artwork, Artist } from '@dia/database/generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { QueryArtworkDto, ArtworkSort } from './dto/query-artwork.dto';
import { RedisService } from '../redis/redis.service';
import { QueryAdminArtworkDto } from './dto/query-admin-artwork.dto';
import { QueryLikedDto } from './dto/query-liked.dto';
import { BadRequestException } from '@nestjs/common';

type ArtworkWithArtist = Artwork & { artist: Artist };

// findAll artist'in sadece 3 alanını seçiyor → tip de onu yansıtsın
type FeedArtwork = Artwork & {
    artist: Pick<Artist, 'id' | 'name' | 'slug'>;
    likeCount: number; // kullanıcıdan bagimsiz → cache'e girer
    isLiked?: boolean;  // kisisel → cache'ten SONRA enrich
};

type FeedResult = {
    items: FeedArtwork[];
    meta: { page: number; limit: number; total: number; pages: number };
};

@Injectable()
export class ArtworkService {
    private readonly logger = new Logger(ArtworkService.name);

    constructor(private prisma: PrismaService, private redis: RedisService) { }

    /**
     * Public gorunurluk invariant'i — TEK KAYNAK.
     * Bir eser feed/daily/detay/liked/koleksiyonda gorunur olmasi icin:
     *   1. admin engellememis  (isPublished: true)
     *   2. yayin tarihi gelmis  (publishAt <= now)
     * Iki sart AND'lenir. Getter → new Date() her cagrida taze now().
     * Admin yollari (findAllAdmin, findOneBySlugAdmin) BU getter'i KULLANMAZ:
     * admin taslaklari + gelecek-tarihli eserleri gorebilmeli.
     * Raw SQL (shuffle) bu objeyi kullanamaz → orada elle yazilir.
     */
    private get publicVisibilityWhere(): Prisma.ArtworkWhereInput {
        return { isPublished: true, publishAt: { lte: new Date() } };
    }

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

    /**
     * Feed sonucuna kullanıcıya özel `isLiked` bilgisini ekler.
     * Cache'e DOKUNMAZ — cache ortak, isLiked kişisel.
     * Tek indexli sorgu (@@unique([userId, artworkId])), N+1 yok.
     */
    private async withLikeStatus(
        result: FeedResult,
        userId: string,
    ): Promise<FeedResult> {
        const ids = result.items.map((a) => a.id);
        if (ids.length === 0) return result;

        const likes = await this.prisma.like.findMany({
            where: { userId, artworkId: { in: ids } },
            select: { artworkId: true },
        });

        const likedIds = new Set(likes.map((l) => l.artworkId));

        return {
            ...result,
            items: result.items.map((a) => ({ ...a, isLiked: likedIds.has(a.id) })),
        };
    }

    // Tek kayıt için isLiked enrich'i. withLikeStatus (liste) kullanılmıyor:
    // tek kayıt için gereksiz dizi kurar/açar, dönüş tipi liste tipi.
    // Tekrarlanan şey mantık değil sorgu → invariant sayılmaz.
    //
    // userId yoksa (misafir) sorgu bile atılmaz.
    private async withSingleLikeStatus<T extends { id: string }>(
        artwork: T | null,
        userId?: string,
    ): Promise<(T & { isLiked: boolean }) | null> {
        if (!artwork) return null;
        if (!userId) return { ...artwork, isLiked: false };

        const like = await this.prisma.like.findFirst({
            where: { userId, artworkId: artwork.id },
            select: { id: true },
        });

        return { ...artwork, isLiked: !!like };
    }

    async findAll(query: QueryArtworkDto, userId: string): Promise<FeedResult> {
        const { page = 1, limit = 20, type, script, artistId, q, refresh, sort } = query;
        const cacheable = !q;
        const cacheKey = this.buildFeedKey(query);
        // refresh=true: kullanici bilerek taze veri istedi (pull-to-refresh) →
        // cache OKUMASINI atla, DB'den taze cek. Cache YAZMASI devam eder (asagida).
        // refresh buildFeedKey'e GIRMEZ → cache key kirlenmez, ayni key'e taze yazilir.
        if (cacheable && !refresh) {
            const cached = await this.redis.get<FeedResult>(cacheKey);
            if (cached) {
                this.logger.log(`feed cache HIT: ${cacheKey}`);
                return this.withLikeStatus(cached, userId);
            }
            this.logger.log(`feed cache MISS: ${cacheKey}`);
        }

        const where: Prisma.ArtworkWhereInput = {
            ...this.publicVisibilityWhere,
            ...(type && { type }),
            ...(script && { script }),
            ...(artistId && { artistId }),
            ...(q && {
                artist: {
                    is: { name: { contains: q, mode: 'insensitive' } },
                },
            }),
        };

        let rawItems: Array<Prisma.ArtworkGetPayload<{
            include: {
                artist: { select: { id: true; name: true; slug: true } };
                _count: { select: { likes: true } };
            };
        }>>;
        let total: number;

        if (sort === ArtworkSort.SHUFFLE) {
            // Shuffle: seed zorunlu (yoksa deterministik olamaz, pagination kirilir).
            if (query.seed === undefined) {
                throw new BadRequestException('shuffle icin seed gerekli');
            }
            // 1. SADECE sirali ID'leri raw cek (hash siralama Prisma orderBy'a sigmaz).
            //    isPublished BURADA da sart (invariant — raw SQL otomatik koymaz).
            const orderedIds = await this.prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "Artwork"
                WHERE "isPublished" = true AND "publishAt" <= NOW()
                ORDER BY md5(id || ${query.seed}::text)
                LIMIT ${limit} OFFSET ${(page - 1) * limit}
            `;
            const ids = orderedIds.map((r) => r.id);

            // 2. O ID'lerle normal Prisma cek — mevcut include/_count AYNEN calisir.
            const unordered = await this.prisma.artwork.findMany({
                where: { id: { in: ids } },
                include: {
                    artist: { select: { id: true, name: true, slug: true } },
                    _count: { select: { likes: true } },
                },
            });

            // 3. IN sirayi BOZAR → raw ID sirasina gore yeniden diz.
            const byId = new Map(unordered.map((a) => [a.id, a]));
            rawItems = ids.map((id) => byId.get(id)!).filter(Boolean);

            // 4. Toplam: ayni where (shuffle filtreyi degistirmez, sadece sirayi).
            total = await this.prisma.artwork.count({ where });
        } else {
            [rawItems, total] = await this.prisma.$transaction([
                this.prisma.artwork.findMany({
                    where,
                    include: {
                        artist: { select: { id: true, name: true, slug: true } },
                        _count: { select: { likes: true } },
                    },
                    orderBy: this.buildOrderBy(sort),
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.prisma.artwork.count({ where }),
            ]);
        }
        // _count nested objesini temiz likeCount alanina cevir → API sekli temiz kalir
        const items: FeedArtwork[] = rawItems.map(({ _count, ...artwork }) => ({
            ...artwork,
            likeCount: _count.likes,
        }));
        const result: FeedResult = { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };

        if (cacheable) {
            await this.redis.set(cacheKey, result, 300);
        }

        return this.withLikeStatus(result, userId);
    }

    async like(artworkId: string, userId: string): Promise<void> {
        try {
            await this.prisma.like.createMany({
                data: { userId, artworkId },
                skipDuplicates: true,
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                throw new NotFoundException('Eser bulunamadı');
            }
            throw e;
        }
    }

    async unlike(artworkId: string, userId: string): Promise<void> {
        await this.prisma.like.deleteMany({
            where: { userId, artworkId },
        });
    }

    async findAllAdmin(query: QueryAdminArtworkDto) {
        const { page = 1, limit = 20, type, script, artistId, q, isPublished, hasImage } = query;

        const where: Prisma.ArtworkWhereInput = {
            ...(isPublished !== undefined && { isPublished }),
            ...(hasImage !== undefined && {
                imageUrl: hasImage ? { not: null } : null,
            }),
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

        return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    // --- GÜN 5: Günün Eseri Mantığı ---
    async findDaily(userId?: string, refresh = false) {
        const cacheKey = `artworks:daily:${this.getTodayKey()}`;
        // refresh=true: pull-to-refresh → cache OKUMASINI atla, taze sec.
        // Cache YAZMASI devam eder (asagida secondsUntilEndOfDay ile).
        // 1. Önce cache'e bak (likeCount cache'te — ortak veri, isLiked enrich SONRA)
        const cached = refresh
            ? null
            : await this.redis.get<ArtworkWithArtist & { likeCount: number }>(cacheKey);
        if (cached) {
            this.logger.log(`daily cache HIT: ${cacheKey}`);
            // İki return var (cache HIT + DB) → ikisi de enrich'ten geçmeli.
            // "İnvariant tek yerde yaşamaz" (Gün 13.5).
            return this.withSingleLikeStatus(cached, userId);
        }
        this.logger.log(`daily cache MISS: ${cacheKey}`);

        // --- DÜZELTME BURADA: Tipi açıkça belirttik ---
        // 'any' yerine projenin artwork tipi neyse onu yazabilirsin, 
        // örneğin: 'let artwork: any = null;'
        let artwork: (ArtworkWithArtist & { likeCount: number }) | null = null;

        // 1) Bugün manuel olarak featured var mı?
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        const manualFeatured = await this.prisma.artwork.findFirst({
            where: {
                ...this.publicVisibilityWhere,
                featuredAt: { gte: startOfToday, lt: startOfTomorrow },
            },
            orderBy: { featuredAt: 'desc' },
            include: { artist: true, _count: { select: { likes: true } } },
        });

        if (manualFeatured) {
            const { _count, ...rest } = manualFeatured;
            artwork = { ...rest, likeCount: _count.likes };
        } else {
            // 2) Fallback: tarihe göre deterministik seçim
            const total = await this.prisma.artwork.count({
                where: this.publicVisibilityWhere,
            });

            if (total === 0) throw new NotFoundException('Yayında eser yok');

            const dayOfYear = this.getDayOfYear(new Date());
            const index = dayOfYear % total;

            const [daily] = await this.prisma.artwork.findMany({
                where: this.publicVisibilityWhere,
                orderBy: { createdAt: 'asc' },
                skip: index,
                take: 1,
                include: { artist: true, _count: { select: { likes: true } } },
            });

            if (daily) {
                const { _count, ...rest } = daily;
                artwork = { ...rest, likeCount: _count.likes };
            }
        }

        // 3. Sonucu cache'e yaz
        if (artwork) {
            await this.redis.set(cacheKey, artwork, this.secondsUntilEndOfDay());
        }

        return this.withSingleLikeStatus(artwork, userId);
    }
    // ----------------------------------

    async findLiked(userId: string, query: QueryLikedDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where = {
            userId,
            artwork: this.publicVisibilityWhere,
        };

        const [likes, total] = await this.prisma.$transaction([
            this.prisma.like.findMany({
                where,
                include: {
                    artwork: {
                        include: {
                            artist: true,
                            _count: { select: { likes: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' }, // Like.createdAt = beğeni tarihi
                skip,
                take: limit,
            }),
            this.prisma.like.count({ where }),
        ]);
        return {
            // _count → likeCount map (temiz shape), isLiked hep true (liked listesi).
            items: likes.map((l) => {
                const { _count, ...artwork } = l.artwork;
                return { ...artwork, likeCount: _count.likes, isLiked: true };
            }),
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    async findOneBySlug(slug: string, userId: string) {
        const artwork = await this.prisma.artwork.findFirst({
            where: { slug, ...this.publicVisibilityWhere },
            include: {
                artist: true,
                _count: { select: { likes: true } },
            },
        });

        if (!artwork) throw new NotFoundException('Eser bulunamadı');

        const like = await this.prisma.like.findFirst({
            where: { userId, artworkId: artwork.id },
            select: { id: true },
        });

        const { _count, ...rest } = artwork;
        return { ...rest, likeCount: _count.likes, isLiked: !!like };
    }

    async findOneBySlugAdmin(slug: string) {
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

    async setFeatured(id: string, featured: boolean) {
        await this.ensureExists(id);
        try {
            if (featured) {
                // B: tek featured garantisi — eskiyi temizle, hedefi set et (atomik)
                await this.prisma.$transaction([
                    this.prisma.artwork.updateMany({
                        where: { featuredAt: { not: null } },
                        data: { featuredAt: null },
                    }),
                    this.prisma.artwork.update({
                        where: { id },
                        data: { featuredAt: new Date() },
                    }),
                ]);
            } else {
                // Sadece hedefi temizle
                await this.prisma.artwork.update({
                    where: { id },
                    data: { featuredAt: null },
                });
            }
            await this.invalidateArtworkCache(); // daily + feed bayatlamasın
            return this.prisma.artwork.findUnique({
                where: { id },
                include: { artist: true },
            });
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    async setPublished(id: string, published: boolean) {
        await this.ensureExists(id);
        try {
            await this.prisma.artwork.update({
                where: { id },
                data: { isPublished: published },
            });
            await this.invalidateArtworkCache(); // feed + daily bayatlamasın
            return this.prisma.artwork.findUnique({
                where: { id },
                include: { artist: true },
            });
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

    // Sort enum → Prisma orderBy. mostLiked ikincil createdAt ile:
    // ayni begeni sayisindaki eserler (cogu 0) deterministik siralanir,
    // yoksa pagination kayar (ayni eser iki sayfada cikabilir).
    private buildOrderBy(
        sort?: ArtworkSort,
    ): Prisma.ArtworkOrderByWithRelationInput | Prisma.ArtworkOrderByWithRelationInput[] {
        // Her sort SON anahtar olarak id alir: id (cuid) benzersiz → deterministik
        // TOPLAM sira. createdAt/likeCount esit kayitlar (ayni ms import, ayni begeni)
        // sayfa sinirinda kaymaz → ayni eser iki sayfada cikmaz. Frontend dedup
        // guard'ini gereksiz kilar (guard yine de zararsiz, kalabilir).
        switch (sort) {
            case ArtworkSort.OLDEST:
                return [{ createdAt: 'asc' }, { id: 'asc' }];
            case ArtworkSort.MOST_LIKED:
                return [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }];
            case ArtworkSort.NEWEST:
            default:
                return [{ createdAt: 'desc' }, { id: 'desc' }];
        }
    }

    private buildFeedKey(query: QueryArtworkDto): string {
        // Gelen query boş olsa bile varsayılan değerlerle sabit bir yapı oluşturuyoruz
        const { type = '', script = '', artistId = '', page = 1, limit = 20 } = query;
        // sort key'e GIRER: farkli siralamalar ayni cache'i ezmesin (cache cakismasi).
        // Default newest → bos string ile ayni davranis (mevcut cache'ler bozulmaz).
        const sort = query.sort ?? '';
        // Shuffle'da seed key'e GIRER: her seed farkli sira = farkli cache.
        // Sadece shuffle'da eklenir → normal sort'larin mevcut key'i bozulmaz.
        const seedPart = sort === ArtworkSort.SHUFFLE ? `|seed=${query.seed ?? ''}` : '';
        // Gun anahtari key'e GIRER: publishAt <= now() sorgusu zamana bagli →
        // gun donunce (TR 00:00 sonrasi yeni eser girer) key degisir, cache taze hesaplanir.
        // Yoksa yeni eser TTL (5 dk) kadar gec gorunurdu. getTodayKey mevcut helper.
        const day = this.getTodayKey();
        // Alanlar HEP aynı sırada — deterministik key garantisi
        return `artworks:feed:day=${day}|type=${type}|script=${script}|artistId=${artistId}|sort=${sort}${seedPart}|page=${page}|limit=${limit}`;
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