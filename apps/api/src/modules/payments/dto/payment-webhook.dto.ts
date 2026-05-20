import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  providerReference: string;

  @IsIn(['authorized', 'paid', 'failed', 'refunded', 'canceled'])
  status: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
