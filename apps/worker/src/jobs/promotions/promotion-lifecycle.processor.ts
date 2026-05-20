import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PromotionLifecycleJobPayload, QUEUES } from '@Gharazi/shared-events';

@Processor(QUEUES.promotionLifecycle)
export class PromotionLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(PromotionLifecycleProcessor.name);

  async process(job: Job<PromotionLifecycleJobPayload>): Promise<void> {
    this.logger.log(`Processing promotion lifecycle action: ${job.data.action}`);
    // TODO: Call PromotionsService-compatible application service from a worker data-access layer.
  }
}
