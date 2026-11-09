import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobPayload, QUEUES } from '@Gharazi/shared-events';
import { PromotionActivationDeliveryService } from '../promotions/promotion-activation-delivery.service';

@Processor(QUEUES.notifications)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly promotionDelivery: PromotionActivationDeliveryService) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    if (job.data.eventId) {
      if (job.data.effectGeneration === undefined) {
        this.logger.warn(`Skipping promotion notification without effect generation: ${job.data.eventId}`);
        return;
      }
      const completed = await this.promotionDelivery.processNotification(job.data.eventId, job.data.effectGeneration);
      if (!completed) this.logger.warn(`Promotion notification was already claimed or completed: ${job.data.eventId}`);
      return;
    }

    this.logger.log(
      `Delivering ${job.data.channel ?? 'in_app'} notification job ${job.id ?? 'unknown'} for ${job.data.userId}`,
    );
    // TODO: Wire real SMS/email/push providers and update delivery rows from worker-side data access.
  }
}
