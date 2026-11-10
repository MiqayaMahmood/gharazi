import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../api/src/database/prisma.service';
import { NotificationsService } from '../../../../api/src/modules/notifications/notifications.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_HORIZON_MS = 15 * DAY_MS;
const PAGE_SIZE = 100;

export type ListingExpiryReminderStage = '15_days' | '7_days' | '1_day' | 'overdue';

type Candidate = {
  id: string;
  publicId: string;
  title: string;
  ownerUserId: string;
  managedByUserId: string | null;
  expiresAt: Date;
};

export function reminderStage(expiresAt: Date, now: Date, overdueBaseline: Date | null): ListingExpiryReminderStage | null {
  const remaining = expiresAt.getTime() - now.getTime();
  if (remaining <= 0) {
    if (!overdueBaseline || expiresAt.getTime() < overdueBaseline.getTime()) return null;
    return 'overdue';
  }
  if (remaining > REMINDER_HORIZON_MS) return null;
  if (remaining <= DAY_MS) return '1_day';
  if (remaining <= 7 * DAY_MS) return '7_days';
  return '15_days';
}

@Injectable()
export class ListingExpiryRemindersService {
  private readonly logger = new Logger(ListingExpiryRemindersService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async generateDueReminders(nowOverride?: Date) {
    if (this.config.get<boolean>('LISTING_EXPIRY_REMINDERS_ENABLED') !== true) {
      return { disabled: true, scanned: 0, upserted: 0, stale: 0 };
    }

    const now = nowOverride ?? await this.databaseNow();
    const configuredBaseline = this.config.get<string>('LISTING_EXPIRY_REMINDERS_BASELINE_AT');
    const parsedBaseline = configuredBaseline ? new Date(configuredBaseline) : null;
    const overdueBaseline = parsedBaseline && Number.isFinite(parsedBaseline.getTime()) ? parsedBaseline : null;
    const horizon = new Date(now.getTime() + REMINDER_HORIZON_MS);
    let cursor: { id: string } | undefined;
    let scanned = 0;
    let upserted = 0;
    let stale = 0;

    for (;;) {
      const listings = await this.prisma.listing.findMany({
        where: {
          status: 'active',
          deletedAt: null,
          AND: [
            { expiresAt: { lte: horizon } },
            overdueBaseline
              ? { OR: [{ expiresAt: { gte: now } }, { expiresAt: { lt: now, gte: overdueBaseline } }] }
              : { expiresAt: { gte: now } },
          ],
        },
        select: { id: true, publicId: true, title: true, ownerUserId: true, managedByUserId: true, expiresAt: true },
        orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
        ...(cursor ? { cursor, skip: 1 } : {}),
        take: PAGE_SIZE,
      });
      if (listings.length === 0) break;

      for (const listing of listings as Candidate[]) {
        scanned += 1;
        const stage = reminderStage(listing.expiresAt, now, overdueBaseline);
        if (!stage) continue;
        const recipients = [...new Set([listing.ownerUserId, listing.managedByUserId].filter((id): id is string => Boolean(id)))];
        for (const userId of recipients) {
          const expiryCycle = listing.expiresAt.toISOString();
          const deduplicationKey = `listing-expiry:v1:${listing.id}:${userId}:${expiryCycle}:${stage}`;
          const result = await this.notifications.createIdempotentExpiryReminder({
            userId,
            listingId: listing.id,
            expiresAt: listing.expiresAt,
            deduplicationKey,
            title: this.titleFor(stage),
            body: this.bodyFor(stage, listing.title),
            payloadJson: {
              listingId: listing.id,
              expiryCycle,
              reminderStage: stage,
              action: 'renew_listing',
            },
          });
          if (result) upserted += 1;
          else stale += 1;
        }
      }

      const last = listings[listings.length - 1];
      cursor = { id: last.id };
      if (listings.length < PAGE_SIZE) break;
    }

    this.logger.log(`Listing expiry reminder scan completed scanned=${scanned} upserted=${upserted} stale=${stale}`);
    return { disabled: false, scanned, upserted, stale };
  }

  private async databaseNow(): Promise<Date> {
    const [{ now }] = await this.prisma.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Database reminder timestamp is unavailable');
    return now;
  }

  private titleFor(stage: ListingExpiryReminderStage) {
    if (stage === 'overdue') return 'Your listing expiry date has passed';
    const days = stage === '15_days' ? 15 : stage === '7_days' ? 7 : 1;
    return `Your listing expires in ${days} ${days === 1 ? 'day' : 'days'}`;
  }

  private bodyFor(stage: ListingExpiryReminderStage, title: string) {
    if (stage === 'overdue') return `“${title}” is still active and its expiry date has passed. Review the listing and renew it if appropriate.`;
    const days = stage === '15_days' ? 15 : stage === '7_days' ? 7 : 1;
    return `“${title}” is due to expire in ${days} ${days === 1 ? 'day' : 'days'}. Review the listing and renew it if appropriate.`;
  }
}
