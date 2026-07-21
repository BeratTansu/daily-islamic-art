import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddItemDto } from './dto/add-item.dto';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) { }

  // ─── Ownership: tek yerde yaşar ───
  private async assertOwnership(collectionId: string, userId: string): Promise<void> {
    const found = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    // 404, 403 değil: erişemediğin kaynak = yok olan kaynak
    if (!found) throw new NotFoundException('Koleksiyon bulunamadı');
  }

  // ─── GET /collections ───
  async findAll(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        // itemCount da SADECE yayindakileri saysin — liste "2 eser" deyip
        // ici 1 gostermesin (menu yalan soylemesin). findOne ile ayni filtre.
        _count: {
          select: { items: { where: { artwork: { isPublished: true } } } },
        },
        items: {
          // Kapak da yayindaki eserden gelsin (kalkan esere denk gelmesin).
          where: { artwork: { isPublished: true } },
          take: 1,
          orderBy: { addedAt: 'desc' },
          select: {
            artwork: { select: { thumbUrl: true, imageUrl: true } },
          },
        },
      },
    });

    // DB şekli ≠ API şekli
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
      coverUrl: c.items[0]
        ? (c.items[0].artwork.thumbUrl ?? c.items[0].artwork.imageUrl)
        : null,
    }));
  }

  async findAllForArtwork(userId: string, artworkId: string) {
    const [collections, memberships] = await Promise.all([
      this.prisma.collection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          // findAll ile ayni: sayim ve kapak sadece yayindaki eserden.
          _count: {
            select: { items: { where: { artwork: { isPublished: true } } } },
          },
          items: {
            where: { artwork: { isPublished: true } },
            take: 1,
            orderBy: { addedAt: 'desc' },
            select: {
              artwork: { select: { thumbUrl: true, imageUrl: true } },
            },
          },
        },
      }),
      // bu eserin bulunduğu koleksiyon id'leri (sadece kullanıcının)
      this.prisma.collectionItem.findMany({
        where: { artworkId, collection: { userId } },
        select: { collectionId: true },
      }),
    ]);

    const memberSet = new Set(memberships.map((m) => m.collectionId));

    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
      coverUrl: c.items[0]
        ? (c.items[0].artwork.thumbUrl ?? c.items[0].artwork.imageUrl)
        : null,
      containsArtwork: memberSet.has(c.id),
    }));
  }

  // ─── GET /collections/:id ───
  async findOne(id: string, userId: string) {
    await this.assertOwnership(id, userId);

    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        items: {
          // Yayindan kalkan eser koleksiyonda GORUNMEZ (Begendiklerim ile ayni
          // davranis). CollectionItem kaydi DB'de DURUR — eser tekrar yayina
          // girerse geri gelir. Veri silinmez, sadece gorunurluk filtresi.
          where: { artwork: { isPublished: true } },
          orderBy: { addedAt: 'desc' },
          select: {
            addedAt: true,
            artwork: {
              select: {
                id: true,
                slug: true,
                thumbUrl: true,
                imageUrl: true,
                artist: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return {
      id: collection!.id,
      name: collection!.name,
      createdAt: collection!.createdAt,
      items: collection!.items.map((i) => ({
        id: i.artwork.id,
        slug: i.artwork.slug,
        thumbUrl: i.artwork.thumbUrl,
        imageUrl: i.artwork.imageUrl,
        artist: i.artwork.artist,
        addedAt: i.addedAt,
      })),
    };
  }

  // ─── POST /collections ───
  async create(dto: CreateCollectionDto, userId: string) {
    const created = await this.prisma.collection.create({
      data: { name: dto.name, userId },
      select: { id: true, name: true, createdAt: true },
    });
    return { ...created, itemCount: 0, coverUrl: null };
  }

  // ─── PATCH /collections/:id ───
  async update(id: string, dto: UpdateCollectionDto, userId: string) {
    await this.assertOwnership(id, userId);
    return this.prisma.collection.update({
      where: { id },
      data: dto,
      select: { id: true, name: true },
    });
  }

  // ─── DELETE /collections/:id ───
  async remove(id: string, userId: string): Promise<void> {
    await this.assertOwnership(id, userId);
    await this.prisma.$transaction([
      this.prisma.collectionItem.deleteMany({ where: { collectionId: id } }),
      this.prisma.collection.delete({ where: { id } }),
    ]);
  }

  // ─── POST /collections/:id/items ───
  async addItem(id: string, dto: AddItemDto, userId: string): Promise<void> {
    await this.assertOwnership(id, userId);
    try {
      await this.prisma.collectionItem.createMany({
        data: { collectionId: id, artworkId: dto.artworkId },
        skipDuplicates: true, // idempotent — Like ile aynı gerekçe
      });
    } catch (e: any) {
      if (e.code === 'P2003') throw new NotFoundException('Eser bulunamadı');
      throw e;
    }
  }

  // ─── DELETE /collections/:id/items/:artworkId ───
  async removeItem(id: string, artworkId: string, userId: string): Promise<void> {
    await this.assertOwnership(id, userId);
    // deleteMany: yoksa da sessiz başarı (idempotent)
    await this.prisma.collectionItem.deleteMany({
      where: { collectionId: id, artworkId },
    });
  }
}