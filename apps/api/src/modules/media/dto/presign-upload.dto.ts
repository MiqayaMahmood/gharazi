import { IsIn, IsString, MaxLength } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @MaxLength(180)
  filename: string;

  @IsString()
  @MaxLength(120)
  contentType: string;

  @IsIn(['listing', 'project'])
  entityType: 'listing' | 'project';

  @IsString()
  @MaxLength(80)
  entityId: string;

  @IsIn(['image', 'video', 'floorplan', 'brochure'])
  mediaType: 'image' | 'video' | 'floorplan' | 'brochure';
}
