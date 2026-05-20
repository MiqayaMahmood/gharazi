import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class AddListingMediaDto {
  @IsIn(['image', 'video', 'floor_plan'])
  mediaType: string;

  @IsString()
  @MaxLength(500)
  storageKey: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
