import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor promotion outbox handling', () => {
  function setup() {
    const delivery = { processNotification: jest.fn().mockResolvedValue(true) };
    return { processor: new NotificationsProcessor(delivery as never), delivery };
  }

  it('processes the promotion activation notification with its event generation', async () => {
    const { processor, delivery } = setup();
    await processor.process({ data: { userId: 'untrusted', eventId: 'event-1', effectGeneration: 4 } } as never);
    expect(delivery.processNotification).toHaveBeenCalledWith('event-1', 4);
  });

  it('does not acknowledge a legacy or malformed promotion job without a generation', async () => {
    const { processor, delivery } = setup();
    await processor.process({ data: { userId: 'seller-1', eventId: 'event-old' } } as never);
    expect(delivery.processNotification).not.toHaveBeenCalled();
  });

  it('preserves the existing generic notification path', async () => {
    const { processor, delivery } = setup();
    await processor.process({ data: { userId: 'seller-1', template: 'existing-template' } } as never);
    expect(delivery.processNotification).not.toHaveBeenCalled();
  });

  it('propagates promotion persistence failures for queue retry handling', async () => {
    const { processor, delivery } = setup();
    delivery.processNotification.mockRejectedValue(new Error('database unavailable'));
    await expect(processor.process({ data: { eventId: 'event-1', effectGeneration: 2 } } as never))
      .rejects.toThrow('database unavailable');
  });
});
