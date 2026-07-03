import { Module } from '@nestjs/common';
import { ArtworkController } from './artwork.controller';
import { ArtworkService } from './artwork.service';

@Module({
  controllers: [ArtworkController],
  providers: [ArtworkService],
  exports: [ArtworkService], // Gün 5 feed + widget bunu kullanacak
})
export class ArtworkModule {}