import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['listing', 'project', 'user', 'chat', 'message'])
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  @MaxLength(64)
  reasonCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
