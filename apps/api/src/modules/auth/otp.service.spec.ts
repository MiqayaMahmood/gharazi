import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { RedisService } from '../../common/redis/redis.service';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  const store = new Map<string, string>();

  const redis = {
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    raw: {
      incr: jest.fn((key: string) => {
        const next = Number(store.get(key) ?? '0') + 1;
        store.set(key, String(next));
        return Promise.resolve(next);
      }),
    },
  };

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('creates and verifies an OTP', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'OTP_DEV_CODE' ? '123456' : undefined)),
            getOrThrow: jest.fn(() => 300),
          },
        },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    const service = moduleRef.get(OtpService);
    await service.createOtp('+923001234567');

    await expect(service.verifyOtp('+923001234567', '123456')).resolves.toBe(true);
    await expect(service.verifyOtp('+923001234567', '123456')).resolves.toBe(false);
  });
});
