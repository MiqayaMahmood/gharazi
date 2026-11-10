import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const ADMIN_LISTING_EXPIRY_BUCKETS = [
  'all_active',
  'within_15_days',
  'within_7_days',
  'within_1_day',
  'overdue',
  'null_expiry',
] as const;

export type AdminListingExpiryBucket = (typeof ADMIN_LISTING_EXPIRY_BUCKETS)[number];

export class AdminListingExpiryQueryDto {
  @IsOptional()
  @IsIn(ADMIN_LISTING_EXPIRY_BUCKETS)
  bucket?: AdminListingExpiryBucket;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
