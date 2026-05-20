import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminNoteDto {
  @IsIn(['user', 'listing', 'project', 'report', 'chat', 'message'])
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  @MaxLength(2000)
  body: string;
}
