import { IsIn, IsString, MaxLength } from 'class-validator';

export class SwapAliasDto {
  @IsIn(['listings', 'projects', 'areas'])
  alias: 'listings' | 'projects' | 'areas';

  @IsString()
  @MaxLength(160)
  targetIndex: string;
}
