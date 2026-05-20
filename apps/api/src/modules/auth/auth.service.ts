import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { normalizePhoneNumber } from '@Gharazi/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { RolesService } from '../roles/roles.service';
import { EmailLoginDto } from './dto/email-login.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber: normalizePhoneNumber(dto.phoneNumber) }] },
    });
    if (existing) throw new BadRequestException('An account with this email or phone already exists');
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = this.publicRole(dto.role);
    const user = await this.prisma.user.create({
      data: {
        email,
        phoneNumber,
        passwordHash,
        status: 'ACTIVE',
        profile: { create: { fullName: dto.fullName, preferredLanguage: 'en' } },
      },
    });
    await this.rolesService.assignRole(user.id, role);
    return this.issueSession(user.id);
  }

  async loginEmail(dto: EmailLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user?.passwordHash || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid email or password');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');
    return this.issueSession(user.id);
  }

  async requestOtp(dto: RequestOtpDto) {
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    await this.otpService.createOtp(phoneNumber);

    return {
      ok: true,
      message: 'OTP requested. Delivery is mocked in Sprint 1.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    const valid = await this.otpService.verifyOtp(phoneNumber, dto.otp);

    if (!valid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phoneNumber },
      update: {
        phoneVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
      create: {
        phoneNumber,
        phoneVerifiedAt: new Date(),
        profile: {
          create: {
            preferredLanguage: 'en',
          },
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
        profile: true,
      },
    });

    if (user.roles.length === 0) {
      await this.rolesService.assignDefaultRole(user.id);
    }

    return this.issueSession(user.id);
  }

  async logout(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user) return { ok: true };
    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const base = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    await this.emailService.sendPasswordReset(user.email as string, `${base}/reset-password?token=${encodeURIComponent(token)}`);
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) throw new BadRequestException('Reset link is invalid or expired');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(dto.password, 12) } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } });
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        roles: {
          include: { role: true },
        },
      },
    });

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.code),
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueSession(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roles = await this.rolesService.getUserRoleCodes(userId);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      roles,
    });
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: accessToken.slice(-32),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, user: await this.getCurrentUser(user.id) };
  }

  private publicRole(role?: string) {
    return ['buyer', 'tenant', 'owner', 'agent', 'developer'].includes(role ?? '') ? role as string : 'buyer';
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
