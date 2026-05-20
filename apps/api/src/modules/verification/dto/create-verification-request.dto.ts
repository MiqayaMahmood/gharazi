import { IsIn, IsObject } from 'class-validator';

export class CreateVerificationRequestDto {
  @IsIn(['owner', 'agent', 'developer', 'company'])
  verificationType: string;

  @IsObject()
  submittedDataJson: Record<string, unknown>;
}
