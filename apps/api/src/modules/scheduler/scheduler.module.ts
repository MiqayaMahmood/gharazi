import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  AnalyticsRollupJobPayload,
  ListingExpiryReminderJobPayload,
  PromotionLifecycleJobPayload,
  QUEUES,
  SavedSearchAlertJobPayload,
  SubscriptionAlertJobPayload,
} from '@Gharazi/shared-events';
import { DEFAULT_JOB_OPTIONS } from '@Gharazi/shared-events/queue-options';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.promotionLifecycle },
      { name: QUEUES.subscriptionAlerts },
      { name: QUEUES.savedSearchAlerts },
      { name: QUEUES.analyticsRollups },
      { name: QUEUES.listingExpiryReminders },
    ),
  ],
})
export class SchedulerModule implements OnModuleInit {
  private readonly logger = new Logger(SchedulerModule.name);

  constructor(
    @InjectQueue(QUEUES.promotionLifecycle)
    private readonly promotions: Queue<PromotionLifecycleJobPayload>,
    @InjectQueue(QUEUES.subscriptionAlerts)
    private readonly subscriptions: Queue<SubscriptionAlertJobPayload>,
    @InjectQueue(QUEUES.savedSearchAlerts)
    private readonly savedSearches: Queue<SavedSearchAlertJobPayload>,
    @InjectQueue(QUEUES.analyticsRollups)
    private readonly analytics: Queue<AnalyticsRollupJobPayload>,
    @InjectQueue(QUEUES.listingExpiryReminders)
    private readonly listingExpiryReminders: Queue<ListingExpiryReminderJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.promotions.add('activate-due', { action: 'activate-due' }, {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '*/10 * * * *' },
      jobId: 'promotion-activate-due',
    });
    await this.promotions.add('end-expired', { action: 'end-expired' }, {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '*/15 * * * *' },
      jobId: 'promotion-end-expired',
    });
    await this.subscriptions.add('expiry-reminder', { action: 'expiry-reminder' }, {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '0 9 * * *' },
      jobId: 'subscription-expiry-reminder',
    });
    await this.analytics.add('daily-rollup', { scope: 'all' }, {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '15 * * * *' },
      jobId: 'analytics-hourly-rollup',
    });
    await this.listingExpiryReminders.add('generate-due', { action: 'generate-due' }, {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '0 9 * * *', tz: 'UTC' },
      jobId: 'listing-expiry-reminders-generate-due',
    });
    this.logger.log('Recurring operational jobs registered');
  }
}
