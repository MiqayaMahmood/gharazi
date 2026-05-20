import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateDeveloperProfileDto {
  @IsString()
  @MaxLength(160)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  officeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
