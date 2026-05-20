import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from '@Gharazi/shared-config';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queues/queue.module';
import { ElasticsearchModule } from './common/elasticsearch/elasticsearch.module';
import { RolesModule } from './modules/roles/roles.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { UsersModule } from './modules/users/users.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SearchModule } from './modules/search/search.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { SavedSearchesModule } from './modules/saved-searches/saved-searches.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminOperationsModule } from './modules/admin-operations/admin-operations.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CmsModule } from './modules/cms/cms.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RiskModule } from './modules/risk/risk.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SearchOpsModule } from './modules/search-ops/search-ops.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { MediaModule } from './modules/media/media.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('RATE_LIMIT_TTL_SECONDS') * 1000,
          limit: config.getOrThrow<number>('RATE_LIMIT_MAX'),
        },
      ],
    }),
    DatabaseModule,
    RedisModule,
    QueueModule,
    ElasticsearchModule,
    RolesModule,
    AuthModule,
    UsersModule,
    DevelopersModule,
    ListingsModule,
    ProjectsModule,
    SearchModule,
    FavoritesModule,
    SavedSearchesModule,
    NotificationsModule,
    ChatModule,
    InquiriesModule,
    VerificationModule,
    ModerationModule,
    AuditModule,
    AdminOperationsModule,
    PromotionsModule,
    SubscriptionsModule,
    AnalyticsModule,
    CmsModule,
    PaymentsModule,
    RiskModule,
    SchedulerModule,
    SearchOpsModule,
    SubmissionsModule,
    NewsletterModule,
    MediaModule,
    LocationsModule,
    TaxonomyModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
