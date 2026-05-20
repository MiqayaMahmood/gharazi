import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateSubmissionStatusDto {
  @IsIn(['new', 'in_progress', 'resolved', 'dismissed'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

export class AssignSubmissionDto {
  @IsUUID()
  assignedToUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
