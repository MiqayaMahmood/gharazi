import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AddProjectUpdateDto {
  @IsString()
  @MaxLength(180)
  title: string;

  @IsString()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsDateString()
  updateDate: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
