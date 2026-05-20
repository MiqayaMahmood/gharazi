import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUES, SearchIndexingJobPayload } from '@Gharazi/shared-events';
import { Queue } from 'bullmq';

@Injectable()
export class SearchIndexingService {
  constructor(
    @InjectQueue(QUEUES.searchIndexing)
    private readonly queue: Queue<SearchIndexingJobPayload>,
  ) {}

  async indexListing(entityId: string, publicId: string): Promise<void> {
    await this.queue.add('index-listing', { type: 'index-listing', entityId, publicId });
  }

  async deleteListing(entityId: string, publicId: string): Promise<void> {
    await this.queue.add('delete-listing', { type: 'delete-listing', entityId, publicId });
  }

  async indexProject(entityId: string, publicId: string): Promise<void> {
    await this.queue.add('index-project', { type: 'index-project', entityId, publicId });
  }

  async deleteProject(entityId: string, publicId: string): Promise<void> {
    await this.queue.add('delete-project', { type: 'delete-project', entityId, publicId });
  }
}
