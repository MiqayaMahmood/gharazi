import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { formatRedisConnectionTarget, parseRedisUrl, validateEnv } from '@Gharazi/shared-config';
import { QUEUES } from '@Gharazi/shared-events';
import { DEFAULT_JOB_OPTIONS } from '@Gharazi/shared-events/queue-options';
import { NotificationsProcessor } from './jobs/notifications/notifications.processor';
import { SavedSearchAlertsProcessor } from './jobs/saved-search-alerts/saved-search-alerts.processor';
import { PromotionLifecycleProcessor } from './jobs/promotions/promotion-lifecycle.processor';
import { AnalyticsRollupsProcessor } from './jobs/analytics/analytics-rollups.processor';
import { PaymentFollowupsProcessor } from './jobs/payments/payment-followups.processor';
import { SubscriptionAlertsProcessor } from './jobs/subscriptions/subscription-alerts.processor';
import { RiskFollowupsProcessor } from './jobs/risk/risk-followups.processor';
import { SearchDocumentBuilder } from './jobs/search-indexing/search-document.builder';
import { SearchIndexingProcessor } from './jobs/search-indexing/search-indexing.processor';
import { WorkerObservabilityService } from './observability/worker-observability.service';
import { PrismaClient } from '@prisma/client';
import { PROMOTION_LIFECYCLE_PRISMA } from './jobs/promotions/promotion-lifecycle.constants';
import { PromotionActivationDeliveryService } from './jobs/promotions/promotion-activation-delivery.service';
import { PromotionLifecycleService } from './jobs/promotions/promotion-lifecycle.service';
import { ListingExpiryRemindersProcessor } from './jobs/listing-expiry-reminders/listing-expiry-reminders.processor';
import { ListingExpiryRemindersService } from './jobs/listing-expiry-reminders/listing-expiry-reminders.service';
import { PrismaService } from '../../api/src/database/prisma.service';
import { NotificationsService } from '../../api/src/modules/notifications/notifications.service';

const logger = new Logger('WorkerModule');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('REDIS_URL');
        logger.log(`Configuring BullMQ Redis connection at ${formatRedisConnectionTarget(redisUrl)}`);

        return {
          connection: {
            ...parseRedisUrl(redisUrl),
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.notifications },
      { name: QUEUES.searchIndexing },
      { name: QUEUES.savedSearchAlerts },
      { name: QUEUES.promotionLifecycle },
      { name: QUEUES.analyticsRollups },
      { name: QUEUES.paymentFollowups },
      { name: QUEUES.subscriptionAlerts },
      { name: QUEUES.riskFollowups },
    ),
  ],
  providers: [
    NotificationsProcessor,
    ListingExpiryRemindersProcessor,
    ListingExpiryRemindersService,
    PrismaService,
    NotificationsService,
    SearchIndexingProcessor,
    SearchDocumentBuilder,
    SavedSearchAlertsProcessor,
    PromotionLifecycleProcessor,
    {
      provide: PROMOTION_LIFECYCLE_PRISMA,
      useFactory: () => new PrismaClient(),
    },
    PromotionActivationDeliveryService,
    PromotionLifecycleService,
    AnalyticsRollupsProcessor,
    PaymentFollowupsProcessor,
    SubscriptionAlertsProcessor,
    RiskFollowupsProcessor,
    WorkerObservabilityService,
  ],
})
export class WorkerModule {}
