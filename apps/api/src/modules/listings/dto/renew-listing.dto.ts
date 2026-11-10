import { IsUUID } from 'class-validator';

export class RenewListingDto {
  @IsUUID()
  idempotencyKey!: string;
}
