import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalReference?: string;
}
