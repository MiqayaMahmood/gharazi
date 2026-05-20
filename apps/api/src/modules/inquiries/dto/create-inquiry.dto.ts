import { IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateInquiryDto {
  @ValidateIf((dto) => !dto.projectId)
  @IsUUID()
  listingId?: string;

  @ValidateIf((dto) => !dto.listingId)
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(['general', 'call_request', 'visit_request', 'price_request'])
  inquiryType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  firstMessage?: string;

  @IsOptional()
  createChat?: boolean;
}
