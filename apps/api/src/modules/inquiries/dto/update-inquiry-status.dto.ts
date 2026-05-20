import { IsIn } from 'class-validator';

export class UpdateInquiryStatusDto {
  @IsIn(['open', 'responded', 'closed', 'spam'])
  status: string;
}
