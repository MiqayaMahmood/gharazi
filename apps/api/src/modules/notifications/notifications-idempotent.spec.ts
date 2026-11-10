import { ConflictException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const input = {
  userId: 'owner-1',
  listingId: '11111111-1111-4111-8111-111111111111',
  expiresAt: new Date('2026-12-01T00:00:00.000Z'),
  deduplicationKey: 'listing-expiry:v1:listing:owner:cycle:15_days',
  title: 'Expires soon',
  body: 'Review renewal',
  payloadJson: { listingId: '11111111-1111-4111-8111-111111111111', expiryCycle: '2026-12-01T00:00:00.000Z', reminderStage: '15_days', action: 'renew_listing' as const },
};

function setup(listingFound = true) {
  const notification = {
    id: 'notice-1', userId: input.userId, notificationType: 'listing_expiry_reminder',
    payloadJson: input.payloadJson,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(listingFound ? [{ id: input.listingId, expiresAt: input.expiresAt }] : []),
    notification: { upsert: jest.fn().mockResolvedValue(notification) },
  };
  const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
  const service = new NotificationsService(prisma as never, {} as never);
  return { service, tx, prisma };
}

describe('NotificationsService idempotent expiry reminders', () => {
  it('revalidates active listing ownership and upserts by the durable key', async () => {
    const { service, tx, prisma } = setup();
    await service.createIdempotentExpiryReminder(input);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { deduplicationKey: input.deduplicationKey },
      create: expect.objectContaining({
        userId: input.userId, notificationType: 'listing_expiry_reminder',
        deliveries: { create: { channel: 'in_app', deliveryStatus: 'sent', sentAt: expect.any(Date) } },
      }),
      update: {},
    }));
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: expect.any(String) });
  });

  it('does not create a reminder if status, deletion, expiry, or recipient relationship changed', async () => {
    const { service, tx } = setup(false);
    await expect(service.createIdempotentExpiryReminder(input)).resolves.toBeNull();
    expect(tx.notification.upsert).not.toHaveBeenCalled();
  });

  it('concurrent attempts share the same unique-key row', async () => {
    const { service, tx } = setup();
    const persisted = new Map<string, ReturnType<typeof notificationRecord>>();
    tx.notification.upsert.mockImplementation(async ({ where }: { where: { deduplicationKey: string } }) => {
      const existing = persisted.get(where.deduplicationKey);
      if (existing) return existing;
      const created = notificationRecord();
      persisted.set(where.deduplicationKey, created);
      return created;
    });
    const results = await Promise.all([
      service.createIdempotentExpiryReminder(input),
      service.createIdempotentExpiryReminder(input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(persisted.size).toBe(1);
    expect(tx.notification.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects an impossible dedupe-key collision rather than exposing another recipient event', async () => {
    const { service, tx } = setup();
    tx.notification.upsert.mockResolvedValueOnce({ ...notificationRecord(), userId: 'unrelated-user' });
    await expect(service.createIdempotentExpiryReminder(input)).rejects.toBeInstanceOf(ConflictException);
  });
});

function notificationRecord() {
  return {
    id: 'notice-1', userId: input.userId, notificationType: 'listing_expiry_reminder',
    payloadJson: input.payloadJson,
  };
}
