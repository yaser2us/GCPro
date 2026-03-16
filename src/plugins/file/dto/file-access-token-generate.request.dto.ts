import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

/**
 * FileAccessToken.Generate Request DTO
 * Source: specs/file/file.pillar.v2.yml
 *
 * HTTP: POST /v1/files/{file_id}/tokens
 * Idempotency: Via Idempotency-Key header
 */
export class FileAccessTokenGenerateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  token_type?: string;

  @IsOptional()
  @IsNumber()
  expires_in_seconds?: number;

  @IsOptional()
  @IsNumber()
  max_uses?: number;
}
