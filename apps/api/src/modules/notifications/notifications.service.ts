import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationJobPayload, QUEUES } from '@Gharazi/shared-events';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

type ExpiryReminderUpsert = {
  where: { deduplicationKey: string };
  create: {
    deduplicationKey: string;
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    payloadJson: Prisma.InputJsonValue;
    deliveries: { create: { channel: string; deliveryStatus: string; sentAt: Date } };
  };
  update: Record<string, never>;
};

type ExpiryReminderNotification = {
  userId: string;
  notificationType: string;
  payloadJson: Prisma.JsonValue | null;
};

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

  async createIdempotentExpiryReminder(input: {
    userId: string;
    listingId: string;
    expiresAt: Date;
    deduplicationKey: string;
    title: string;
    body: string;
    payloadJson: { listingId: string; expiryCycle: string; reminderStage: string; action: 'renew_listing' };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.$queryRaw<Array<{ id: string; expiresAt: Date }>>`
        SELECT id, expires_at AS "expiresAt"
        FROM sch_gharazi.listings
        WHERE id = ${input.listingId}::uuid
          AND status = 'active'
          AND deleted_at IS NULL
          AND (owner_user_id = ${input.userId}::uuid OR managed_by_user_id = ${input.userId}::uuid)
        FOR UPDATE
      `;
      if (listing.length === 0 || listing[0].expiresAt.getTime() !== input.expiresAt.getTime()) return null;

      // The generated Prisma client is refreshed during the approved migration/release process.
      const notificationModel = tx.notification as unknown as {
        upsert(args: ExpiryReminderUpsert): Promise<ExpiryReminderNotification>;
      };
      const notification = await notificationModel.upsert({
        where: { deduplicationKey: input.deduplicationKey },
        create: {
          deduplicationKey: input.deduplicationKey,
          userId: input.userId,
          notificationType: 'listing_expiry_reminder',
          title: input.title,
          body: input.body,
          payloadJson: input.payloadJson as Prisma.InputJsonValue,
          deliveries: { create: { channel: 'in_app', deliveryStatus: 'sent', sentAt: new Date() } },
        },
        update: {},
      });

      const payload = notification.payloadJson as Record<string, unknown> | null;
      if (
        notification.userId !== input.userId ||
        notification.notificationType !== 'listing_expiry_reminder' ||
        payload?.listingId !== input.payloadJson.listingId ||
        payload?.expiryCycle !== input.payloadJson.expiryCycle ||
        payload?.reminderStage !== input.payloadJson.reminderStage ||
        payload?.action !== 'renew_listing'
      ) {
        throw new ConflictException('Expiry reminder deduplication key conflicts with another notification');
      }
      return notification;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
