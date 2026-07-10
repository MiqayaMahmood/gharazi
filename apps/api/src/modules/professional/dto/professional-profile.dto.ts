import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export const PROFESSIONAL_TYPES = ['agent_agency', 'developer_builder', 'property_dealer', 'property_marketing_company', 'other_real_estate_business'] as const;

export class CreateProfessionalProfileDto {
  @IsString() @MaxLength(160) businessName: string;
  @IsIn(PROFESSIONAL_TYPES) businessType: string;
  @IsString() @MaxLength(120) contactPersonName: string;
  @IsString() @MaxLength(32) phone: string;
  @IsOptional() @IsString() @MaxLength(32) whatsapp?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsUrl() @MaxLength(500) websiteUrl?: string;
  @IsOptional() @IsUrl() @MaxLength(1000) logoUrl?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsString() @MaxLength(500) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateProfessionalProfileDto extends PartialType(CreateProfessionalProfileDto) {}
