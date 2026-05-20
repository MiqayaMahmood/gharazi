import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;

  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsIn(['en', 'ur'])
  preferred_language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsapp_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company_name?: string;

  @IsOptional()
  @IsUrl()
  website_url?: string;
}
