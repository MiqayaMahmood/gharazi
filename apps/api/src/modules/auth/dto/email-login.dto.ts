import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class EmailLoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
