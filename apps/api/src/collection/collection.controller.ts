import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Req, UseGuards, HttpCode, HttpStatus,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
  import { CollectionService } from './collection.service';
  import { CreateCollectionDto } from './dto/create-collection.dto';
  import { UpdateCollectionDto } from './dto/update-collection.dto';
  import { AddItemDto } from './dto/add-item.dto';
  
  @Controller('collections')
  @UseGuards(JwtAuthGuard) // tüm route'lar login gerektirir
  export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}
  
    @Get()
    findAll(@Req() req: AuthenticatedRequest) {
      return this.collectionService.findAll(req.user.id);
    }
  
    @Post()
    create(@Body() dto: CreateCollectionDto, @Req() req: AuthenticatedRequest) {
      return this.collectionService.create(dto, req.user.id);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
      return this.collectionService.findOne(id, req.user.id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: UpdateCollectionDto,
      @Req() req: AuthenticatedRequest,
    ) {
      return this.collectionService.update(id, dto, req.user.id);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
      return this.collectionService.remove(id, req.user.id);
    }
  
    @Post(':id/items')
    @HttpCode(HttpStatus.NO_CONTENT)
    addItem(
      @Param('id') id: string,
      @Body() dto: AddItemDto,
      @Req() req: AuthenticatedRequest,
    ) {
      return this.collectionService.addItem(id, dto, req.user.id);
    }
  
    @Delete(':id/items/:artworkId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeItem(
      @Param('id') id: string,
      @Param('artworkId') artworkId: string,
      @Req() req: AuthenticatedRequest,
    ) {
      return this.collectionService.removeItem(id, artworkId, req.user.id);
    }
  }