import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @IsOptional()
  @IsIn(['text', 'system', 'attachment'])
  messageType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsUrl()
  attachmentUrl?: string;
}
