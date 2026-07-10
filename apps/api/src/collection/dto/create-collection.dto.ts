import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}