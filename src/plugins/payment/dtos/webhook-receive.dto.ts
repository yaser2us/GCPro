import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * WebhookReceiveDto
 * DTO for receiving webhook
 * Based on specs/payment/payment.pillar.v2.yml
 */
export class WebhookReceiveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerEventId?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  headersJson?: any;

  @IsNotEmpty()
  payloadJson: any;
}
