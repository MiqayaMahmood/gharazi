import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationJobPayload, QUEUES } from '@Gharazi/shared-events';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.notifications) private readonly queue: Queue<NotificationJobPayload>,
  ) {}

  async create(input: {
    userId: string;
    notificationType: string;
    title: string;
    body?: string;
    payloadJson?: Record<string, unknown>;
    queueDelivery?: boolean;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        notificationType: input.notificationType,
        title: input.title,
        body: input.body,
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
        deliveries: { create: { channel: 'in_app', deliveryStatus: 'sent', sentAt: new Date() } },
      },
    });

    if (input.queueDelivery) {
      await this.queue.add('deliver-notification', {
        userId: input.userId,
        notificationId: notification.id,
        channel: 'in_app',
        template: input.notificationType,
        data: input.payloadJson,
      });
    }

    return notification;
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      include: { deliveries: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification was not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
