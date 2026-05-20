import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, RiskFollowupJobPayload } from '@Gharazi/shared-events';

@Processor(QUEUES.riskFollowups)
export class RiskFollowupsProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskFollowupsProcessor.name);

  async process(job: Job<RiskFollowupJobPayload>): Promise<void> {
    this.logger.log(`Processing risk follow-up ${job.data.action} for ${job.data.riskFlagId}`);
    // TODO: Escalate high-risk flags and notify operations queues.
  }
}
