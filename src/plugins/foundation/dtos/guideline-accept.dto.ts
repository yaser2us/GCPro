import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class GuidelineAcceptDto {
  @IsNumber()
  version_id: number;

  @IsOptional()
  @IsNumber()
  account_id?: number;

  @IsOptional()
  @IsNumber()
  person_id?: number;

  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  acceptance_status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  user_agent?: string;

  @IsOptional()
  meta_json?: any;
}
