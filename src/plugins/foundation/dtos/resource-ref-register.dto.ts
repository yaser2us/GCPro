import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class ResourceRefRegisterDto {
  @IsString()
  @MaxLength(64)
  resource_type: string;

  @IsNumber()
  resource_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  resource_uuid?: string;
}
