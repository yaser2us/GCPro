import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * PaymentIntentCreateDto
 * DTO for creating payment intent
 * Based on specs/payment/payment.pillar.v2.yml
 */
export class PaymentIntentCreateDto {
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @IsOptional()
  @IsNumber()
  personId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  intentType: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string = 'MYR';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  purposeCode?: string = 'other';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  refType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  refId?: string;

  @IsOptional()
  @IsNumber()
  paymentMethodId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  callbackUrl?: string;

  @IsOptional()
  metaJson?: any;
}
