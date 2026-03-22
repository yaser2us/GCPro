import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class KYCUpsertDto {
  @IsString()
  @MaxLength(16)
  subject_type: string;

  @IsNumber()
  subject_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  provider?: string;

  @IsString()
  @MaxLength(32)
  status: string;

  @IsOptional()
  meta_json?: any;
}
