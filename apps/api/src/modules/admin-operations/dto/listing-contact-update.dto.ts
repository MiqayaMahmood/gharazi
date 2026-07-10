import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListingContactUpdatesQueryDto {
  @IsOptional()
  @IsIn(['all', 'missing'])
  filter?: 'all' | 'missing';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class UpdateListingContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactWhatsapp?: string | null;
}
