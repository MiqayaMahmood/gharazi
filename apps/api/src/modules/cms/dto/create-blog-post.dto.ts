import { IsIn, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBlogPostDto {
  @IsString() @MaxLength(180) title: string;
  @IsOptional() @IsString() @MaxLength(220) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) excerpt?: string;
  @IsObject() contentJson: Record<string, unknown>;
  @IsOptional() @IsUrl() coverImageUrl?: string;
  @IsOptional() @IsIn(['draft', 'published']) status?: string;
}
