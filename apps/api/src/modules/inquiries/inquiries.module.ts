import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

@Module({
  imports: [ChatModule, NotificationsModule, AnalyticsModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
