import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(32)
  phoneNumber: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsIn(['buyer', 'tenant', 'owner', 'agent', 'developer'])
  role?: string;
}
