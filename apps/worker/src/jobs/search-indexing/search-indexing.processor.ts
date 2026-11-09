import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { Job } from 'bullmq';
import { QUEUES, SearchIndexingJobPayload } from '@Gharazi/shared-events';
import { SearchDocumentBuilder } from './search-document.builder';
import { PromotionActivationDeliveryService } from '../promotions/promotion-activation-delivery.service';

@Processor(QUEUES.searchIndexing)
export class SearchIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchIndexingProcessor.name);
  private readonly client: Client;

  constructor(
    private readonly documentBuilder: SearchDocumentBuilder,
    private readonly config: ConfigService,
    private readonly promotionDelivery: PromotionActivationDeliveryService,
  ) {
    super();
    this.client = new Client({ node: this.config.getOrThrow<string>('ELASTICSEARCH_URL') });
  }

  async process(job: Job<SearchIndexingJobPayload>): Promise<void> {
    let claimToken: string | null = null;
    if (job.data.eventId) {
      if (job.data.effectGeneration === undefined) {
        this.logger.warn(`Skipping promotion index job without effect generation: ${job.data.eventId}`);
        return;
      }
      if (job.data.type !== 'index-listing' && job.data.type !== 'index-project') {
        this.logger.warn(`Skipping non-index operation carrying promotion event ${job.data.eventId}`);
        return;
      }
      claimToken = await this.promotionDelivery.claimSearchIndex(
        job.data.eventId,
        job.data.effectGeneration,
        job.data.type === 'index-listing' ? 'listing' : 'project',
        job.data.entityId,
      );
      if (!claimToken) {
        this.logger.warn(`Promotion index event is already claimed or complete: ${job.data.eventId}`);
        return;
      }
    }

    try {
      await this.processIndexOperation(job);
      if (job.data.eventId && job.data.effectGeneration !== undefined && claimToken) {
        const acknowledged = await this.promotionDelivery.acknowledgeSearchIndex(job.data.eventId, job.data.effectGeneration, claimToken);
        if (!acknowledged) this.logger.warn(`Promotion index acknowledgment was stale: ${job.data.eventId}`);
      }
    } catch (error) {
      if (job.data.eventId && job.data.effectGeneration !== undefined && claimToken) {
        await this.promotionDelivery.failSearchIndex(job.data.eventId, job.data.effectGeneration, claimToken, error);
      }
      throw error;
    }
  }

  private async processIndexOperation(job: Job<SearchIndexingJobPayload>): Promise<void> {
    switch (job.data.type) {
      case 'index-listing': {
        const document = await this.documentBuilder.buildListingDocument(job.data.entityId, job.data.publicId);
        if (!document) {
          if (job.data.eventId) throw new Error('Promotion listing document is unavailable');
          return;
        }
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
        if (!document) {
          if (job.data.eventId) throw new Error('Promotion project document is unavailable');
          return;
        }
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
