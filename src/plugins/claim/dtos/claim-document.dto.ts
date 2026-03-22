import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * ClaimDocument DTO
 * Source: specs/claim/claim.pillar.v2.yml lines 1650-1659
 *
 * Used for adding documents to claims
 */
export class ClaimDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileUploadId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType: string;
}
