import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AnalyticsRollupJobPayload, QUEUES } from '@Gharazi/shared-events';

@Processor(QUEUES.analyticsRollups)
export class AnalyticsRollupsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsRollupsProcessor.name);

  async process(job: Job<AnalyticsRollupJobPayload>): Promise<void> {
    this.logger.log(`Processing analytics event rollup for ${job.data.scope} on ${job.data.statDate ?? 'latest'}`);
    // TODO: Aggregate analytics_events into listing_daily_stats and project_daily_stats idempotently.
  }
}
