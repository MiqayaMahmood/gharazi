import { IsBoolean, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional() @IsUUID() purposeId?: string;
  @IsOptional() @IsUUID() propertyTypeId?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsUUID() areaId?: string;

  @IsObject()
  filtersJson: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;
}
