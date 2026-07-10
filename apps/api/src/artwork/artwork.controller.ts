import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
    UploadedFile, UseInterceptors, Req,
    ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FeatureArtworkDto } from './dto/feature-artwork.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtworkService } from './artwork.service';
import { StorageService } from '../storage/storage.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { QueryArtworkDto } from './dto/query-artwork.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@dia/database/generated/client/index.js';
import { PublishArtworkDto } from './dto/publish-artwork.dto';
import { QueryAdminArtworkDto } from './dto/query-admin-artwork.dto';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';

@Controller('artworks')
export class ArtworkController {
    constructor(
        private readonly artworkService: ArtworkService,
        private readonly storage: StorageService,
    ) { }

    // ── Public okuma ──
    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Query() query: QueryArtworkDto, @Req() req: AuthenticatedRequest) {
        return this.artworkService.findAll(query, req.user.id);
    }

    // ✅ DOĞRU SIRA: Statik rota (daily), dinamik rotadan (:slug) önce tanımlandı
    @Get('daily')
    findDaily() {
        return this.artworkService.findDaily();
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    findAllAdmin(@Query() query: QueryAdminArtworkDto) {
        return this.artworkService.findAllAdmin(query);
    }

    @Get('admin/:slug')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    findOneBySlugAdmin(@Param('slug') slug: string) {
        return this.artworkService.findOneBySlugAdmin(slug);
    }

    @Post(':id/like')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    like(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.artworkService.like(id, req.user.id);
    }

    @Delete(':id/like')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    unlike(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.artworkService.unlike(id, req.user.id);
    }

    // ⚠️ DİNAMİK ROTA: Statiklerin altında
    @Get(':slug')
    @UseGuards(JwtAuthGuard)
    findOneBySlug(
        @Param('slug') slug: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.artworkService.findOneBySlug(slug, req.user.id);
    }

    // ── Admin yazma ──
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateArtworkDto) {
        return this.artworkService.create(dto);
    }

    // ── Admin görsel upload ──
    // POST (statik path) — GET :slug ile method farklı olduğu için çakışmaz.
    @Post('upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 12 * 1024 * 1024 }, // hard ceiling: 12 MB (kaba kalkan)
        }),
    )
    async uploadImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // iş kuralı: 10 MB
                    new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
    ): Promise<{ imageUrl: string }> {
        const imageUrl = await this.storage.upload(
            file.buffer,
            file.mimetype,
            'artworks',
        );
        return { imageUrl };
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateArtworkDto) {
        return this.artworkService.update(id, dto);
    }

    @Patch(':id/featured')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    setFeatured(@Param('id') id: string, @Body() dto: FeatureArtworkDto) {
        return this.artworkService.setFeatured(id, dto.featured);
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    setPublished(
        @Param('id') id: string,
        @Body() dto: PublishArtworkDto,
    ) {
        return this.artworkService.setPublished(id, dto.published);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.artworkService.remove(id);
    }
}