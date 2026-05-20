import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

const CODE_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SearchListingsQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID('4', { message: 'cityId must be a UUID. Use citySlug for city slugs.' }) cityId?: string;
  @IsOptional() @Matches(SLUG_PATTERN, { message: 'citySlug must be a URL slug such as lahore or karachi.' }) citySlug?: string;
  @IsOptional() @IsUUID('4', { message: 'areaId must be a UUID. Use areaSlug for area slugs.' }) areaId?: string;
  @IsOptional() @Matches(SLUG_PATTERN, { message: 'areaSlug must be a URL slug such as dha-phase-6-lahore.' }) areaSlug?: string;
  @IsOptional() @IsUUID('4', { message: 'purposeId must be a UUID. Use purposeCode for purpose codes.' }) purposeId?: string;
  @IsOptional() @IsIn(['buy', 'sale', 'rent'], { message: 'purpose must be one of buy, sale, or rent.' }) purpose?: string;
  @IsOptional() @Matches(CODE_PATTERN, { message: 'purposeCode must be a code such as sale or rent.' }) purposeCode?: string;
  @IsOptional() @IsUUID('4', { message: 'propertyTypeId must be a UUID. Use propertyTypeCode for codes such as house, apartment, commercial, or plot.' }) propertyTypeId?: string;
  @IsOptional() @Matches(CODE_PATTERN, { message: 'propertyTypeCode must be a code such as house, apartment, commercial, or plot.' }) propertyTypeCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minArea?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxArea?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) north?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) south?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) east?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) west?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) radiusKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) bathrooms?: number;
  @IsOptional() @IsString() furnishedStatus?: string;
  @IsOptional() @Type(() => Boolean) verifiedOnly?: boolean;
  @IsOptional()
  @IsIn(['relevant', 'newest', 'price_low_high', 'price_high_low', 'area_low_high', 'area_high_low'])
  sort?: string = 'relevant';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
