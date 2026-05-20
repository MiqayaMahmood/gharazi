import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRiskFlagDto {
  @IsIn(['user', 'listing', 'project'])
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  @MaxLength(64)
  riskType: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
