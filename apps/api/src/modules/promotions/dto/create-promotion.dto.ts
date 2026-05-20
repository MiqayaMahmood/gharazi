import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePromotionDto {
  @IsIn(['listing', 'project'])
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsIn(['featured', 'homepage', 'area_spotlight'])
  promotionType: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
