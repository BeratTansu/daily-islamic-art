import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ImageProcessingService } from './image-processing.service';

@Global()
@Module({
  providers: [StorageService, ImageProcessingService],
  exports: [StorageService, ImageProcessingService],
})
export class StorageModule {}