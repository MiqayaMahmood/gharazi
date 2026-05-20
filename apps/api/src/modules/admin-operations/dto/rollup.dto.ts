import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class RollupDto {
  @IsOptional()
  @IsIn(['listings', 'projects', 'all'])
  scope?: 'listings' | 'projects' | 'all';

  @IsOptional()
  @IsDateString()
  statDate?: string;
}
