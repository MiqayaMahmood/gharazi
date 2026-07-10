import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MaxLength(64)
  packageCode: string;

  @IsOptional()
  @IsIn(['listing', 'project', 'agency', 'developer', 'banner'])
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}
