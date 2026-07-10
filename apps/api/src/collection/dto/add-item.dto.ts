import { IsString, IsNotEmpty } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  artworkId: string;
}