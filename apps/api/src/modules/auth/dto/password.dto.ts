import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(255)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}
