import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@Gharazi/shared-events';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.notifications },
      { name: QUEUES.searchIndexing },
      { name: QUEUES.analyticsRollups },
      { name: QUEUES.paymentFollowups },
    ),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
