import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ListingExpiryReminderJobPayload, QUEUES } from '@Gharazi/shared-events';
import { ListingExpiryRemindersService } from './listing-expiry-reminders.service';

@Processor(QUEUES.listingExpiryReminders)
export class ListingExpiryRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(ListingExpiryRemindersProcessor.name);

  constructor(private readonly reminders: ListingExpiryRemindersService) {
    super();
  }

  async process(job: Job<ListingExpiryReminderJobPayload>): Promise<void> {
    if (job.data.action !== 'generate-due') {
      this.logger.warn(`Ignoring unknown listing expiry reminder action: ${String(job.data.action)}`);
      return;
    }
    const result = await this.reminders.generateDueReminders();
    this.logger.log(`Listing expiry reminder job finished: ${JSON.stringify(result)}`);
  }
}
