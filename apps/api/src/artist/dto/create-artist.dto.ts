import {
    IsString, IsOptional, IsBoolean, IsNotEmpty
  } from 'class-validator';
  
  export class CreateArtistDto {
    @IsNotEmpty() @IsString()
    name: string;
  
    @IsOptional() @IsString()
    bio?: string;
  
    @IsOptional() @IsString()
    era?: string;
  
    @IsOptional() @IsString()
    country?: string;
  
    @IsOptional() @IsBoolean()
    isContemporary?: boolean;
  }