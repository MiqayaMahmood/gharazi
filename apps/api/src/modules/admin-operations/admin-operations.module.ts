import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RiskModule } from '../risk/risk.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';

@Module({
  imports: [AuditModule, NotificationsModule, RiskModule, AnalyticsModule, PaymentsModule],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsService],
})
export class AdminOperationsModule {}
