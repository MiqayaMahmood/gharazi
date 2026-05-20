import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AddProjectUnitDto {
  @IsUUID()
  propertyTypeId: string;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  areaUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPriceAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPaymentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyInstallmentAmount?: number;

  @IsOptional()
  @IsIn(['ready', 'under_construction', 'pre_launch', 'completed', 'other'])
  possessionStatus?: string;

  @IsOptional()
  @IsIn(['available', 'limited', 'sold_out', 'coming_soon'])
  inventoryStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
