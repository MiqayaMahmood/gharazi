import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

const CODE_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SearchProjectsQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID('4', { message: 'cityId must be a UUID. Use citySlug for city slugs.' }) cityId?: string;
  @IsOptional() @Matches(SLUG_PATTERN, { message: 'citySlug must be a URL slug such as lahore or karachi.' }) citySlug?: string;
  @IsOptional() @IsUUID('4', { message: 'areaId must be a UUID. Use areaSlug for area slugs.' }) areaId?: string;
  @IsOptional() @Matches(SLUG_PATTERN, { message: 'areaSlug must be a URL slug such as dha-phase-6-lahore.' }) areaSlug?: string;
  @IsOptional() @IsUUID('4', { message: 'projectTypeId must be a UUID. Use projectTypeCode for codes such as apartment, mixed-use, or commercial.' }) projectTypeId?: string;
  @IsOptional() @Matches(CODE_PATTERN, { message: 'projectTypeCode must be a code such as apartment, mixed-use, or commercial.' }) projectTypeCode?: string;
  @IsOptional() @Matches(CODE_PATTERN, { message: 'propertyTypeCode must be a code such as apartment, mixed-use, or commercial.' }) propertyTypeCode?: string;
  @IsOptional() @IsString() possessionStatus?: string;
  @IsOptional() @IsString() legalStatus?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) north?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) south?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) east?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) west?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) radiusKm?: number;
  @IsOptional()
  @IsIn(['relevant', 'newest', 'price_low_high', 'price_high_low'])
  sort?: string = 'relevant';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
