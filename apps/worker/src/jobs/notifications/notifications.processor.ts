import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobPayload, QUEUES } from '@Gharazi/shared-events';

@Processor(QUEUES.notifications)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.log(
      `Delivering ${job.data.channel ?? 'in_app'} notification job ${job.id ?? 'unknown'} for ${job.data.userId}`,
    );
    // TODO: Wire real SMS/email/push providers and update delivery rows from worker-side data access.
  }
}
