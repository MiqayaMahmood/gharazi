import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, SavedSearchAlertJobPayload } from '@Gharazi/shared-events';

@Processor(QUEUES.savedSearchAlerts)
export class SavedSearchAlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(SavedSearchAlertsProcessor.name);

  async process(job: Job<SavedSearchAlertJobPayload>): Promise<void> {
    this.logger.log(
      `Evaluating saved-search alert ${job.data.savedSearchId} for user ${job.data.userId}`,
    );
    // TODO: Query Elasticsearch and enqueue notifications for new matching listings/projects.
  }
}
