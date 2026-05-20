import { IsEmail, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class BaseSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subject?: string;

  @IsString()
  @MaxLength(3000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourcePage?: string;

  @IsOptional()
  @IsIn(['web', 'widget', 'contact_page', 'homepage'])
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  website?: string;
}

export class CreateFeedbackDto extends BaseSubmissionDto {}

export class CreateContactDto extends BaseSubmissionDto {
  @ValidateIf((dto: CreateContactDto) => !dto.phone)
  @IsEmail()
  @MaxLength(255)
  declare email?: string;
}

export class CreateSupportRequestDto extends BaseSubmissionDto {
  @IsOptional()
  @IsIn(['low', 'normal', 'high'])
  priority?: string;
}
