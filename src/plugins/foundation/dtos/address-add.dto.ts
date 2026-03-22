import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class AddressAddDto {
  @IsString()
  @MaxLength(16)
  owner_type: string;

  @IsNumber()
  owner_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  state_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
