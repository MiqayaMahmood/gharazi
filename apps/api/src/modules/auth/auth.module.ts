import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/auth/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { RolesModule } from '../roles/roles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
    EmailModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
