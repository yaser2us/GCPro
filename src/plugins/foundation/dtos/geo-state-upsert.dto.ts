import { IsString, IsOptional, MaxLength } from 'class-validator';

export class GeoStateUpsertDto {
  @IsString()
  @MaxLength(8)
  country_code: string;

  @IsString()
  @MaxLength(32)
  state_code: string;

  @IsString()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  status?: string;
}
