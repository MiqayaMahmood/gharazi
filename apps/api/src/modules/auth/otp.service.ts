import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async createOtp(phoneNumber: string): Promise<void> {
    const otp = this.config.get<string>('OTP_DEV_CODE') ?? randomInt(100000, 999999).toString();
    const ttl = this.config.getOrThrow<number>('OTP_TTL_SECONDS');

    await this.redis.set(this.otpKey(phoneNumber), otp, ttl);
    await this.redis.set(this.attemptsKey(phoneNumber), '0', ttl);

    // TODO: Replace with SMS provider integration and remove OTP logging before production.
    this.logger.log(`Mock OTP for ${phoneNumber}: ${otp}`);
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const attemptsKey = this.attemptsKey(phoneNumber);
    const attempts = Number((await this.redis.get(attemptsKey)) ?? '0');

    // TODO: Promote this into a reusable throttling guard with IP and device signals.
    if (attempts >= 5) {
      return false;
    }

    const storedOtp = await this.redis.get(this.otpKey(phoneNumber));
    await this.redis.raw.incr(attemptsKey);

    if (!storedOtp || storedOtp !== otp) {
      return false;
    }

    await this.redis.del(this.otpKey(phoneNumber));
    await this.redis.del(attemptsKey);
    return true;
  }

  private otpKey(phoneNumber: string): string {
    return `auth:otp:${phoneNumber}`;
  }

  private attemptsKey(phoneNumber: string): string {
    return `auth:otp-attempts:${phoneNumber}`;
  }
}
