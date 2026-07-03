import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ArtworkService } from './artwork.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { QueryArtworkDto } from './dto/query-artwork.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@dia/database/generated/client/index.js';

@Controller('artworks')
export class ArtworkController {
    constructor(private readonly artworkService: ArtworkService) { }

    // ── Public okuma ──
    @Get()
    findAll(@Query() query: QueryArtworkDto) {
        return this.artworkService.findAll(query);
    }

    // ✅ DOĞRU SIRA: Statik rota (daily), dinamik rotadan (:slug) önce tanımlandı
    @Get('daily')
    findDaily() {
        return this.artworkService.findDaily();
    }

    // ⚠️ DİNAMİK ROTA: Statiklerin altında
    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.artworkService.findOneBySlug(slug);
    }

    // ── Admin yazma ──
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateArtworkDto) {
        return this.artworkService.create(dto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateArtworkDto) {
        return this.artworkService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.artworkService.remove(id);
    }
}