import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateListingDto {
  @IsUUID()
  purposeId: string;

  @IsUUID()
  propertyTypeId: string;

  @IsUUID()
  cityId: string;

  @IsUUID()
  areaId: string;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsNumber()
  @Min(0)
  priceAmount: number;

  @IsNumber()
  @Min(0)
  areaValue: number;

  @IsString()
  @MaxLength(32)
  areaUnit: string;

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
  @IsInt()
  floorNumber?: number;

  @IsOptional()
  @IsInt()
  totalFloors?: number;

  @IsOptional()
  @IsInt()
  @Min(1800)
  yearBuilt?: number;

  @IsOptional()
  @IsIn(['unfurnished', 'semi_furnished', 'furnished'])
  furnishedStatus?: string;

  @IsOptional()
  @IsIn(['ready', 'under_construction', 'leased', 'other'])
  possessionStatus?: string;

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
  @IsIn(['exact', 'approximate', 'hidden'])
  locationPrecision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  amenityIds?: string[];
}
