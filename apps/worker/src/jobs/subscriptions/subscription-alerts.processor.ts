import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, SubscriptionAlertJobPayload } from '@Gharazi/shared-events';

@Processor(QUEUES.subscriptionAlerts)
export class SubscriptionAlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionAlertsProcessor.name);

  async process(job: Job<SubscriptionAlertJobPayload>): Promise<void> {
    this.logger.log(`Processing subscription alert ${job.data.action} for ${job.data.subscriptionId ?? 'batch'}`);
    // TODO: Queue expiry notifications and mark expired subscriptions.
  }
}
