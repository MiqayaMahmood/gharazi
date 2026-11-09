import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PromotionLifecycleJobPayload, QUEUES } from '@Gharazi/shared-events';
import { PromotionLifecycleService } from './promotion-lifecycle.service';

@Processor(QUEUES.promotionLifecycle)
export class PromotionLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(PromotionLifecycleProcessor.name);

  constructor(private readonly lifecycle: PromotionLifecycleService) {
    super();
  }

  async process(job: Job<PromotionLifecycleJobPayload>): Promise<void> {
    if (job.data.action === 'activate-due') {
      const result = await this.lifecycle.activateDuePromotions();
      this.logger.log(`Promotion activation run finished: ${JSON.stringify(result)}`);
      return;
    }

    // Promotion expiration remains intentionally inactive in this work item.
    this.logger.warn('Promotion expiration processing remains disabled');
  }
}
