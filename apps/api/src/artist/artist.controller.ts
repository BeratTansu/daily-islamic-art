import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  } from '@nestjs/common';
  import { ArtistService } from './artist.service';
  import { CreateArtistDto } from './dto/create-artist.dto';
  import { UpdateArtistDto } from './dto/update-artist.dto';
  import { QueryArtistDto } from './dto/query-artist.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '@dia/database/generated/client/index.js';
  
  @Controller('artists')
  export class ArtistController {
    constructor(private readonly artistService: ArtistService) {}
  
    // ── Public okuma ──
    @Get()
    findAll(@Query() query: QueryArtistDto) {
      return this.artistService.findAll(query);
    }

    // STATIK route — :slug'tan ONCE gelmeli (yoksa "by-id" slug sanilir).
    // Combobox edit modunda secili artistId'nin adini cekmek icin.
    @Get('by-id/:id')
    findOneById(@Param('id') id: string) {
      return this.artistService.findOneById(id);
    }

    @Get(':slug')
    findOne(@Param('slug') slug: string) {
      return this.artistService.findOneBySlug(slug);
    }
  
    // ── Admin yazma ──
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    create(@Body() dto: CreateArtistDto) {
      return this.artistService.create(dto);
    }
  
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
      return this.artistService.update(id, dto);
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
      return this.artistService.remove(id);
    }
  }