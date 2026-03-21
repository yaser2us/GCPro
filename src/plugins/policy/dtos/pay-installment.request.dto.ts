import { IsString, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActorDto } from './activate-policy.request.dto';

/**
 * PayInstallment Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1515-1533
 *
 * HTTP: POST /api/v1/policy/installment/:installmentId/pay
 */
export class PayInstallmentRequestDto {
  @IsString()
  installment_id: string;

  @IsString()
  @MaxLength(20)
  payment_method: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payment_ref?: string;

  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;
}
