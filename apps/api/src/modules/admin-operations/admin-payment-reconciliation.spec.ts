import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService payment reconciliation audit', () => {
  function setup(reconcile: jest.Mock) {
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const service = new AdminOperationsService(
      {} as never,
      audit as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { reconcile } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, audit };
  }

  it('records the successful reconciliation outcome and actor', async () => {
    const { service, audit } = setup(jest.fn().mockResolvedValue({ outcome: 'fulfilled' }));
    await service.reconcilePayment('admin-1', 'payment-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'admin-1', action: 'payment.reconcile', entityType: 'payment_transaction', entityId: 'payment-1',
      metadataJson: { outcome: 'fulfilled' },
    }));
  });

  it('records a failed reconciliation attempt before returning the error', async () => {
    const { service, audit } = setup(jest.fn().mockRejectedValue(new Error('ineligible')));
    await expect(service.reconcilePayment('admin-1', 'payment-1')).rejects.toThrow('ineligible');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'admin-1', action: 'payment.reconcile', entityId: 'payment-1',
      metadataJson: { outcome: 'failed', errorType: 'Error' },
    }));
  });
});
