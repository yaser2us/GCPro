import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * PaymentMethodCreateDto
 * DTO for creating payment method
 * Based on specs/payment/payment.pillar.v2.yml
 */
export class PaymentMethodCreateDto {
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @IsOptional()
  @IsNumber()
  personId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  methodType: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerCustomerRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerMethodRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  last4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  expMm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  expYyyy?: string;

  @IsOptional()
  consentJson?: any;

  @IsOptional()
  metaJson?: any;
}
