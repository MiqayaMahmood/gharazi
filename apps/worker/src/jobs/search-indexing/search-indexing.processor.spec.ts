jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({ index: jest.fn(), delete: jest.fn() })),
}));

import { Client } from '@elastic/elasticsearch';
import { SearchIndexingProcessor } from './search-indexing.processor';

describe('SearchIndexingProcessor promotion acknowledgments', () => {
  const document = { id: 'listing-1', entity: 'listing' };
  function setup() {
    const builder = {
      buildListingDocument: jest.fn().mockResolvedValue(document),
      buildProjectDocument: jest.fn().mockResolvedValue({ id: 'project-1', entity: 'project' }),
    };
    const config = { getOrThrow: jest.fn((key: string) => key === 'ELASTICSEARCH_URL' ? 'http://localhost:9200' : 'gharazi') };
    const delivery = {
      claimSearchIndex: jest.fn().mockResolvedValue('claim-1'),
      acknowledgeSearchIndex: jest.fn().mockResolvedValue(true),
      failSearchIndex: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new SearchIndexingProcessor(builder as never, config as never, delivery as never);
    const client = (Client as unknown as jest.Mock).mock.results.at(-1)?.value;
    return { processor, builder, delivery, client };
  }

  it('acknowledges only after the idempotent entity-keyed Elasticsearch write succeeds', async () => {
    const { processor, builder, delivery, client } = setup();
    await processor.process({
      id: 'job-1', data: { type: 'index-listing', entityId: 'listing-1', publicId: 'PUB-1', eventId: 'event-1', effectGeneration: 3 },
    } as never);
    expect(delivery.claimSearchIndex).toHaveBeenCalledWith('event-1', 3, 'listing', 'listing-1');
    expect(builder.buildListingDocument).toHaveBeenCalledWith('listing-1', 'PUB-1');
    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ id: 'listing-1', document }));
    expect(delivery.acknowledgeSearchIndex).toHaveBeenCalledWith('event-1', 3, 'claim-1');
    expect(delivery.failSearchIndex).not.toHaveBeenCalled();
  });

  it('persists retryable outbox failure when indexing fails, then rethrows for BullMQ retry handling', async () => {
    const { processor, delivery, client } = setup();
    const failure = new Error('Elasticsearch unavailable');
    client.index.mockRejectedValue(failure);
    await expect(processor.process({
      data: { type: 'index-listing', entityId: 'listing-1', eventId: 'event-2', effectGeneration: 1 },
    } as never)).rejects.toBe(failure);
    expect(delivery.failSearchIndex).toHaveBeenCalledWith('event-2', 1, 'claim-1', failure);
    expect(delivery.acknowledgeSearchIndex).not.toHaveBeenCalled();
  });

  it('does not acknowledge when the activation document cannot be built', async () => {
    const { processor, builder, delivery } = setup();
    builder.buildListingDocument.mockResolvedValue(null);
    await expect(processor.process({
      data: { type: 'index-listing', entityId: 'listing-1', eventId: 'event-3', effectGeneration: 2 },
    } as never)).rejects.toThrow('Promotion listing document is unavailable');
    expect(delivery.failSearchIndex).toHaveBeenCalled();
    expect(delivery.acknowledgeSearchIndex).not.toHaveBeenCalled();
  });

  it('preserves the generic indexing path without using the promotion outbox', async () => {
    const { processor, delivery, client } = setup();
    await processor.process({ data: { type: 'index-listing', entityId: 'listing-1' } } as never);
    expect(client.index).toHaveBeenCalled();
    expect(delivery.claimSearchIndex).not.toHaveBeenCalled();
    expect(delivery.acknowledgeSearchIndex).not.toHaveBeenCalled();
  });

  it('ignores stale or invalid activation-index jobs without mutating Elasticsearch', async () => {
    const { processor, delivery, client } = setup();
    delivery.claimSearchIndex.mockResolvedValue(null);
    await processor.process({ data: { type: 'index-listing', entityId: 'listing-1', eventId: 'stale', effectGeneration: 2 } } as never);
    await processor.process({ data: { type: 'delete-listing', entityId: 'listing-1', eventId: 'invalid', effectGeneration: 1 } } as never);
    expect(client.index).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });
});
