import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { Job } from 'bullmq';
import { QUEUES, SearchIndexingJobPayload } from '@Gharazi/shared-events';
import { SearchDocumentBuilder } from './search-document.builder';

@Processor(QUEUES.searchIndexing)
export class SearchIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchIndexingProcessor.name);
  private readonly client: Client;

  constructor(
    private readonly documentBuilder: SearchDocumentBuilder,
    private readonly config: ConfigService,
  ) {
    super();
    this.client = new Client({ node: this.config.getOrThrow<string>('ELASTICSEARCH_URL') });
  }

  async process(job: Job<SearchIndexingJobPayload>): Promise<void> {
    switch (job.data.type) {
      case 'index-listing': {
        const document = await this.documentBuilder.buildListingDocument(job.data.entityId, job.data.publicId);
        if (!document) return;
        await this.client.index({
          index: this.alias('listings_current'),
          id: job.data.entityId,
          document,
        });
        this.logger.log(`Prepared listing index job ${job.id ?? 'unknown'} for ${document.id}`);
        break;
      }
      case 'delete-listing':
        await this.client.delete(
          { index: this.alias('listings_current'), id: job.data.entityId },
          { ignore: [404] },
        );
        this.logger.log(`Prepared listing delete job ${job.id ?? 'unknown'} for ${job.data.entityId}`);
        break;
      case 'index-project': {
        const document = await this.documentBuilder.buildProjectDocument(job.data.entityId, job.data.publicId);
        if (!document) return;
        await this.client.index({
          index: this.alias('projects_current'),
          id: job.data.entityId,
          document,
        });
        this.logger.log(`Prepared project index job ${job.id ?? 'unknown'} for ${document.id}`);
        break;
      }
      case 'delete-project':
        await this.client.delete(
          { index: this.alias('projects_current'), id: job.data.entityId },
          { ignore: [404] },
        );
        this.logger.log(`Prepared project delete job ${job.id ?? 'unknown'} for ${job.data.entityId}`);
        break;
      default:
        this.logger.warn(`Unknown search-indexing job type: ${(job.data as { type?: string }).type}`);
    }

  }

  private alias(alias: string): string {
    return `${this.config.getOrThrow<string>('ELASTICSEARCH_INDEX_PREFIX')}_${alias}`;
  }
}
