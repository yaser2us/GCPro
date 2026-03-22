import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SmokProfileUpsertDto {
  @IsString()
  @MaxLength(32)
  code: string;

  @IsOptional()
  @IsString()
  smoker_factor?: string;

  @IsOptional()
  @IsString()
  loading_pct?: string;
}
