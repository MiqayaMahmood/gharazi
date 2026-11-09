import { PromotionLifecycleProcessor } from './promotion-lifecycle.processor';

describe('PromotionLifecycleProcessor', () => {
  it('routes only the existing activate-due action to the gated activation service', async () => {
    const lifecycle = { activateDuePromotions: jest.fn().mockResolvedValue({ disabled: true, activated: 0, outboxCompleted: 0 }) };
    const processor = new PromotionLifecycleProcessor(lifecycle as never);
    await processor.process({ data: { action: 'activate-due' } } as never);
    expect(lifecycle.activateDuePromotions).toHaveBeenCalledTimes(1);
  });

  it('leaves the existing end-expired job inactive', async () => {
    const lifecycle = { activateDuePromotions: jest.fn() };
    const processor = new PromotionLifecycleProcessor(lifecycle as never);
    await processor.process({ data: { action: 'end-expired' } } as never);
    expect(lifecycle.activateDuePromotions).not.toHaveBeenCalled();
  });
});
