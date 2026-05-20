import { IsEmail, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsObject()
  interestsJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourcePage?: string;
}
