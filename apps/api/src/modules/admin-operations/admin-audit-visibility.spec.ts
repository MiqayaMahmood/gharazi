import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService audit visibility', () => {
  it('includes actor context while redacting unapproved grant metadata', async () => {
    const audit = {
      list: jest.fn().mockResolvedValue([{
        id: 'audit-1', action: 'promotion.admin_grant', actorUserId: 'admin-1',
        actorUser: { id: 'admin-1', profile: { fullName: 'Admin User' } },
        entityType: 'promotion', entityId: 'promotion-1', createdAt: new Date('2026-01-01T00:00:00Z'),
        metadataJson: {
          listingId: 'listing-1', promotionType: 'listing_hot', durationDays: 14,
          reason: 'Approved campaign', grantedAt: '2026-01-01T00:00:00Z',
          stripeSecret: 'must-not-be-returned', paymentIntent: 'pi_private',
        },
      }]),
    };
    const service = new AdminOperationsService(
      {} as never, audit as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );

    const [row] = await service.auditLogs(100);
    expect(row).toMatchObject({
      actorUser: { id: 'admin-1', profile: { fullName: 'Admin User' } },
      entityType: 'promotion', entityId: 'promotion-1',
      metadataJson: { listingId: 'listing-1', promotionType: 'listing_hot', durationDays: 14, reason: 'Approved campaign' },
    });
    expect(JSON.stringify(row)).not.toContain('must-not-be-returned');
    expect(JSON.stringify(row)).not.toContain('pi_private');
  });

  it('keeps only reconciliation outcome fields in payment audit metadata', async () => {
    const audit = { list: jest.fn().mockResolvedValue([{
      id: 'audit-2', action: 'payment.reconcile', actorUserId: 'admin-1',
      entityType: 'payment_transaction', entityId: 'payment-1', createdAt: new Date(),
      metadataJson: { outcome: 'fulfilled', errorType: 'Error', providerPayload: { secret: 'hidden' } },
    }]) };
    const service = new AdminOperationsService(
      {} as never, audit as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    const [row] = await service.auditLogs(100);
    expect(row.metadataJson).toEqual({ outcome: 'fulfilled', errorType: 'Error' });
    expect(JSON.stringify(row)).not.toContain('providerPayload');
  });
});
