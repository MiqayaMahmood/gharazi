import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
