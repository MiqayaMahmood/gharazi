import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRiskFlagDto {
  @IsOptional()
  @IsIn(['open', 'reviewing', 'resolved', 'dismissed'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
