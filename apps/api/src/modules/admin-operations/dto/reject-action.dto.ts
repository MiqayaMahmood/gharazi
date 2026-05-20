import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
