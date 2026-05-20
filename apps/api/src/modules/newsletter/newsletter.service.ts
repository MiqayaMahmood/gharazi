import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: SubscribeNewsletterDto) {
    const email = dto.email.toLowerCase().trim();
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        name: dto.name?.trim() || undefined,
        city: dto.city?.trim() || undefined,
        interestsJson: dto.interestsJson as Prisma.InputJsonValue | undefined,
        sourcePage: dto.sourcePage,
        status: 'active',
      },
      create: {
        email,
        name: dto.name?.trim() || undefined,
        city: dto.city?.trim() || undefined,
        interestsJson: dto.interestsJson as Prisma.InputJsonValue | undefined,
        sourcePage: dto.sourcePage,
        status: 'active',
      },
    });
    return {
      ok: true,
      message: 'You are subscribed to Gharazi property updates.',
      subscriberId: subscriber.id,
      status: subscriber.status,
    };
  }

  async unsubscribe(email: string) {
    await this.prisma.newsletterSubscriber.updateMany({
      where: { email: email.toLowerCase().trim() },
      data: { status: 'unsubscribed' },
    });
    return { ok: true, message: 'You have been unsubscribed.' };
  }
}
