import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCmsPageDto {
  @IsString() @MaxLength(180) title: string;
  @IsOptional() @IsString() @MaxLength(180) slug?: string;
  @IsObject() contentJson: Record<string, unknown>;
  @IsOptional() @IsIn(['draft', 'published']) status?: string;
}
