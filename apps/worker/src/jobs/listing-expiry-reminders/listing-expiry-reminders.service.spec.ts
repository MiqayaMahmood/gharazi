import { ListingExpiryRemindersService, reminderStage } from './listing-expiry-reminders.service';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-10T09:00:00.000Z');
const BASELINE = new Date('2026-11-10T00:00:00.000Z');

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    publicId: 'LST-1',
    title: 'Sample listing',
    ownerUserId: 'owner-1',
    managedByUserId: 'manager-1',
    expiresAt: new Date(NOW.getTime() + 10 * DAY),
    ...overrides,
  };
}

function setup(options: {
  enabled?: boolean;
  baseline?: string;
  listings?: ReturnType<typeof candidate>[];
  createResult?: unknown;
} = {}) {
  const config = {
    get: jest.fn((key: string) => key === 'LISTING_EXPIRY_REMINDERS_ENABLED'
      ? options.enabled === true
      : key === 'LISTING_EXPIRY_REMINDERS_BASELINE_AT' ? options.baseline : undefined),
  };
  const prisma = { listing: { findMany: jest.fn().mockResolvedValue(options.listings ?? []) } };
  const notifications = { createIdempotentExpiryReminder: jest.fn().mockResolvedValue(options.createResult ?? { id: 'notice-1' }) };
  const service = new ListingExpiryRemindersService(config as never, prisma as never, notifications as never);
  return { service, config, prisma, notifications };
}

describe('ListingExpiryRemindersService', () => {
  it.each([
    [15, '15_days'],
    [7, '7_days'],
    [1, '1_day'],
  ] as const)('selects the %s-day reminder stage at its boundary', (days, expected) => {
    expect(reminderStage(new Date(NOW.getTime() + days * DAY), NOW, null)).toBe(expected);
  });

  it('uses a deterministic catch-up band so a delayed run sends only the current stage', () => {
    expect(reminderStage(new Date(NOW.getTime() + 5 * DAY), NOW, null)).toBe('7_days');
    expect(reminderStage(new Date(NOW.getTime() + 10 * DAY), NOW, null)).toBe('15_days');
    expect(reminderStage(new Date(NOW.getTime() - DAY), NOW, null)).toBeNull();
  });

  it('allows one overdue stage only for an expiry at or after the explicit baseline', () => {
    expect(reminderStage(new Date(BASELINE.getTime() - 1), NOW, BASELINE)).toBeNull();
    expect(reminderStage(BASELINE, NOW, BASELINE)).toBe('overdue');
    expect(reminderStage(new Date(NOW.getTime() - DAY), NOW, null)).toBeNull();
  });

  it('is a strict no-op when the feature gate is missing or false', async () => {
    const { service, prisma, notifications } = setup();
    await expect(service.generateDueReminders(NOW)).resolves.toEqual({ disabled: true, scanned: 0, upserted: 0, stale: 0 });
    expect(prisma.listing.findMany).not.toHaveBeenCalled();
    expect(notifications.createIdempotentExpiryReminder).not.toHaveBeenCalled();
  });

  it('creates owner and explicitly assigned manager in-app notifications with expiry-cycle keys', async () => {
    const row = candidate();
    const { service, prisma, notifications } = setup({ enabled: true, listings: [row] });
    await service.generateDueReminders(NOW);
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', deletedAt: null }),
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: 100,
    }));
    expect(notifications.createIdempotentExpiryReminder).toHaveBeenCalledTimes(2);
    const inputs = notifications.createIdempotentExpiryReminder.mock.calls.map(([input]) => input);
    expect(inputs.map((input) => input.userId)).toEqual(['owner-1', 'manager-1']);
    expect(inputs[0].deduplicationKey).toContain(`${row.id}:owner-1:${row.expiresAt.toISOString()}:15_days`);
    expect(inputs[0].payloadJson).toEqual(expect.objectContaining({ listingId: row.id, expiryCycle: row.expiresAt.toISOString(), reminderStage: '15_days', action: 'renew_listing' }));
    expect(inputs[0].payloadJson).not.toHaveProperty('contactPhone');
    expect(inputs[0].body).toContain('renew it if appropriate');
  });

  it('deduplicates owner/manager identity and excludes historical overdue listings', async () => {
    const overdueHistorical = candidate({ expiresAt: new Date(BASELINE.getTime() - DAY), managedByUserId: 'owner-1' });
    const eligibleOverdue = candidate({ id: '22222222-2222-4222-8222-222222222222', expiresAt: new Date(NOW.getTime() - DAY / 4), managedByUserId: null });
    const { service, notifications } = setup({ enabled: true, baseline: BASELINE.toISOString(), listings: [overdueHistorical, eligibleOverdue] });
    await service.generateDueReminders(NOW);
    expect(notifications.createIdempotentExpiryReminder).toHaveBeenCalledTimes(1);
    expect(notifications.createIdempotentExpiryReminder.mock.calls[0][0]).toEqual(expect.objectContaining({
      userId: 'owner-1', listingId: eligibleOverdue.id,
      payloadJson: expect.objectContaining({ reminderStage: 'overdue', expiryCycle: eligibleOverdue.expiresAt.toISOString() }),
    }));
  });

  it('uses a renewed expiry as a distinct reminder cycle', async () => {
    const oldExpiry = new Date(NOW.getTime() + 10 * DAY);
    const renewed = candidate({ expiresAt: new Date(NOW.getTime() + 100 * DAY) });
    const first = setup({ enabled: true, listings: [candidate({ expiresAt: oldExpiry })] });
    const second = setup({ enabled: true, listings: [renewed] });
    await first.service.generateDueReminders(NOW);
    await second.service.generateDueReminders(NOW);
    const oldKey = first.notifications.createIdempotentExpiryReminder.mock.calls[0][0].deduplicationKey;
    const newKey = second.notifications.createIdempotentExpiryReminder.mock.calls[0]?.[0].deduplicationKey;
    expect(oldKey).toContain(oldExpiry.toISOString());
    expect(newKey).toBeUndefined(); // A renewed expiry beyond 15 days has no due reminder yet.
    const renewedDue = candidate({ expiresAt: new Date(NOW.getTime() + 14 * DAY) });
    const third = setup({ enabled: true, listings: [renewedDue] });
    await third.service.generateDueReminders(NOW);
    expect(third.notifications.createIdempotentExpiryReminder.mock.calls[0][0].deduplicationKey).toContain(renewedDue.expiresAt.toISOString());
  });

  it('allows concurrent generators to converge on the same durable per-recipient keys', async () => {
    const sent = new Set<string>();
    const sharedNotifications = {
      createIdempotentExpiryReminder: jest.fn(async ({ deduplicationKey }: { deduplicationKey: string }) => {
        sent.add(deduplicationKey);
        return { id: deduplicationKey };
      }),
    };
    const row = candidate();
    const makeService = () => new ListingExpiryRemindersService(
      { get: (key: string) => key === 'LISTING_EXPIRY_REMINDERS_ENABLED' ? true : undefined } as never,
      { listing: { findMany: jest.fn().mockResolvedValue([row]) } } as never,
      sharedNotifications as never,
    );
    await Promise.all([makeService().generateDueReminders(NOW), makeService().generateDueReminders(NOW)]);
    expect(sharedNotifications.createIdempotentExpiryReminder).toHaveBeenCalledTimes(4);
    expect(sent.size).toBe(2); // owner and manager; duplicate runs use the same two unique constraints.
  });

  it('does not enqueue external delivery or mutate listings', async () => {
    const { service, prisma, notifications } = setup({ enabled: true, listings: [candidate()] });
    await service.generateDueReminders(NOW);
    expect(prisma.listing).not.toHaveProperty('update');
    expect(notifications.createIdempotentExpiryReminder.mock.calls[0][0]).not.toHaveProperty('queueDelivery');
  });

  it('does not generate reminders for null expiry or deleted/ineligible rows returned by the query boundary', async () => {
    const { service, prisma, notifications } = setup({ enabled: true });
    await service.generateDueReminders(NOW);
    const where = prisma.listing.findMany.mock.calls[0][0].where;
    expect(where).toEqual(expect.objectContaining({ status: 'active', deletedAt: null }));
    expect(where.AND[0]).toEqual({ expiresAt: { lte: new Date(NOW.getTime() + 15 * DAY) } });
    expect(notifications.createIdempotentExpiryReminder).not.toHaveBeenCalled();
  });
});
