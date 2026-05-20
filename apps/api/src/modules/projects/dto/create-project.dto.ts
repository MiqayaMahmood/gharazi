import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @IsUUID()
  cityId: string;

  @IsUUID()
  areaId: string;

  @IsUUID()
  projectTypeId: string;

  @IsString()
  @MaxLength(180)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsIn(['ready', 'under_construction', 'pre_launch', 'completed', 'other'])
  possessionStatus: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  legalStatus?: string;

  @IsOptional()
  @IsDateString()
  expectedHandoverDate?: string;

  @IsOptional()
  @IsDateString()
  launchDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;

  @IsOptional()
  @IsUrl()
  brochureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentPlanSummary?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPriceAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceAmount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  amenityIds?: string[];
}
