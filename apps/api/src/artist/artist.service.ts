import {
    Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { Prisma } from '@dia/database/generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { QueryArtistDto } from './dto/query-artist.dto';

@Injectable()
export class ArtistService {
    constructor(private prisma: PrismaService) { }

    private slugify(input: string): string {
        return input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
    }

    async create(dto: CreateArtistDto) {
        const base = this.slugify(dto.name);
        const slug = `${base}-${Date.now().toString(36)}`; // basit unique garanti

        try {
            return await this.prisma.artist.create({
                data: { ...dto, slug },
            });
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    async findAll(query: QueryArtistDto) {
        const { page = 1, limit = 20, q, era, country, isContemporary } = query;

        const where: Prisma.ArtistWhereInput = {
            ...(era && { era }),
            ...(country && { country }),
            ...(isContemporary !== undefined && { isContemporary }),
            // Artık sadece isimde arama yapacak, bio'yu eledik:
            ...(q && { name: { contains: q, mode: 'insensitive' } }),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.artist.findMany({
                where,
                // Claude'un istediği gibi _count ile eser sayısını gösteriyoruz
                include: {
                    _count: {
                        select: { artworks: true },
                    },
                },
                orderBy: { name: 'asc' }, // İsim sırasına göre getirmek mantıklı olur
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.artist.count({ where }),
        ]);

        return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async findOneBySlug(slug: string) {
        const artist = await this.prisma.artist.findUnique({
            where: { slug },
            include: { artworks: true }, // Sanatçının detayına girince eserlerini de görelim
        });
        if (!artist) throw new NotFoundException('Sanatçı bulunamadı');
        return artist;
    }

    async update(id: string, dto: UpdateArtistDto) {
        await this.ensureExists(id);
        try {
            return await this.prisma.artist.update({ where: { id }, data: dto });
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    async remove(id: string) {
        await this.ensureExists(id);
        try {
            // return kelimesini sildik, sadece işlemi yapıp bitiriyoruz
            await this.prisma.artist.delete({ where: { id } });
        } catch (e) {
            this.handlePrismaError(e);
        }
    }

    // ── ortak yardımcılar ──
    private async ensureExists(id: string) {
        const found = await this.prisma.artist.findUnique({ where: { id } });
        if (!found) throw new NotFoundException('Sanatçı bulunamadı');
    }

    private handlePrismaError(e: unknown): never {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') throw new ConflictException('Bu slug zaten kullanılıyor');
            if (e.code === 'P2003') throw new ConflictException('Bu sanatçının eserleri var, önce onları silmelisiniz');
        }
        throw e;
    }
}