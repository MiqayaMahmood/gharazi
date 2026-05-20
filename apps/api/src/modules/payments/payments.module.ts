import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuditModule, NotificationsModule, AnalyticsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
