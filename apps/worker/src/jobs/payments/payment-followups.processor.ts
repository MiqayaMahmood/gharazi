import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PaymentFollowupJobPayload, QUEUES } from '@Gharazi/shared-events';

@Processor(QUEUES.paymentFollowups)
export class PaymentFollowupsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentFollowupsProcessor.name);

  async process(job: Job<PaymentFollowupJobPayload>): Promise<void> {
    this.logger.log(`Processing payment follow-up ${job.data.action} for ${job.data.transactionId}`);
    // TODO: Verify provider state and expire stale pending transactions.
  }
}
