import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * PaymentIntentConfirmDto
 * DTO for confirming payment intent
 * Based on specs/payment/payment.pillar.v2.yml
 */
export class PaymentIntentConfirmDto {
  @IsOptional()
  @IsNumber()
  paymentMethodId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;
}
