import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminPromotionGrantDto {
  @IsUUID()
  idempotencyKey: string;

  @IsUUID()
  listingId: string;

  @IsIn(['listing_hot', 'listing_super_hot'])
  promotionType: string;

  @IsInt()
  @Min(1)
  @Max(30)
  durationDays: number;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}
