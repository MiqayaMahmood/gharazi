import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsIn(['subscription', 'promotion'])
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  provider?: string;
}
