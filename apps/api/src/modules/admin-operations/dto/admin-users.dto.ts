import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminRoleDto {
  @IsString()
  @MaxLength(64)
  roleCode: string;
}

export class CreateAdminUserDto {
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
  @IsString()
  @MaxLength(120)
  fullName?: string;
}

export class AdminSetUserStatusDto {
  @IsIn(['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'])
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
}
