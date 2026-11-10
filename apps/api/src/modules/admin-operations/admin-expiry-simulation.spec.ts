import 'reflect-metadata';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminExpirySimulationQueryDto } from './dto/admin-expiry-simulation-query.dto';
import { AdminOperationsService } from './admin-operations.service';

const cutoff = new Date('2026-01-01T00:00:00.000Z');
const beforeGrace = new Date('2026-01-30T23:59:59.000Z');
const afterGrace = new Date('2026-01-31T00:00:00.000Z');
const activeCounts = {
  activeTotal: 20, activeWithExpiry: 18, overdueAtEvaluation: 10,
  historicalCohort: 4, candidates: 8, candidatesAtGraceEnd: 9, nullExpiry: 2,
};

function serviceFor(scenario: string, evaluation: Date) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([activeCounts]),
    listing: {
      findMany: jest.fn().mockResolvedValue([{
        id: 'listing-1', publicId: 'GZ-1', title: 'Example home', ownerUserId: 'owner-id',
        status: 'active', expiresAt: new Date('2025-12-31T00:00:00.000Z'),
      }]),
      count: jest.fn().mockResolvedValue(8),
      update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(),
    },
  };
  const service = new AdminOperationsService(
    prisma as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
  );
  return {
    prisma,
    service,
    run: () => service.simulateListingExpiry({
      scenario: scenario as 'A' | 'B' | 'C',
      cutoffAt: cutoff.toISOString(), evaluatedAt: evaluation.toISOString(), page: 2, limit: 5,
    }),
  };
}

describe('admin expiry simulation', () => {
  it.each([
    ['A', afterGrace, { gte: cutoff, lte: afterGrace }, 4, null],
    ['B', beforeGrace, { gte: cutoff, lte: beforeGrace }, 4, 9],
    ['B', afterGrace, { lte: afterGrace }, 0, 9],
    ['C', afterGrace, { lte: afterGrace }, 0, null],
  ] as const)('classifies scenario %s at the stated timestamp without inferring activation', async (scenario, evaluation, expiryWhere, protectedCount, graceCandidates) => {
    const { prisma, run } = serviceFor(scenario, evaluation);
    const result = await run();
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'active', deletedAt: null, expiresAt: expiryWhere },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], skip: 5, take: 5,
    }));
    expect(result).toMatchObject({
      hypothetical: true, scenario, candidates: 8, historicalProtected: protectedCount,
      candidatesAtGraceEnd: graceCandidates, activeTotal: 20, projectedActiveAfterHypothetical: 12,
      page: 2, limit: 5, total: 8,
    });
  });

  it('treats an expiry exactly at cutoff as post-cutoff and does not include null expiry', async () => {
    const { prisma, run } = serviceFor('A', afterGrace);
    await run();
    const where = prisma.listing.findMany.mock.calls[0][0].where;
    expect(where.expiresAt).toEqual({ gte: cutoff, lte: afterGrace });
    expect(where).toMatchObject({ status: 'active', deletedAt: null });
  });

  it('supports evaluating before a future cutoff without inferring the activation date', async () => {
    const evaluation = new Date('2025-12-01T00:00:00.000Z');
    const { prisma, service } = serviceFor('A', evaluation);
    const result = await service.simulateListingExpiry({
      scenario: 'A', cutoffAt: cutoff.toISOString(), evaluatedAt: evaluation.toISOString(),
    });
    expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'active', deletedAt: null, expiresAt: { gte: cutoff, lte: evaluation } },
    }));
    expect(result.historicalProtected).toBe(4);
  });

  it('keeps search and data mutation paths untouched', async () => {
    const { prisma, run } = serviceFor('C', afterGrace);
    const result = await run();
    expect(result.items[0].daysOverdue).toBeGreaterThan(0);
    expect(prisma.listing.update).not.toHaveBeenCalled();
    expect(prisma.listing.updateMany).not.toHaveBeenCalled();
    expect(prisma.listing.delete).not.toHaveBeenCalled();
  });

  it('requires explicit timezone-qualified timestamps and a supported scenario', async () => {
    const invalid = Object.assign(new AdminExpirySimulationQueryDto(), {
      scenario: 'D', cutoffAt: '2026-01-01T00:00:00', evaluatedAt: '2026-02-01T00:00:00Z',
    });
    expect(await validate(invalid)).not.toHaveLength(0);
    const valid = Object.assign(new AdminExpirySimulationQueryDto(), {
      scenario: 'B', cutoffAt: cutoff.toISOString(), evaluatedAt: afterGrace.toISOString(),
    });
    expect(await validate(valid)).toHaveLength(0);
  });

  it('uses the existing admin/moderator authorization guard and denies other roles', () => {
    const guard = new RolesGuard(new Reflector());
    const handler = AdminOperationsController.prototype.listingExpirySimulation;
    const allowed = (roles: string[]) => guard.canActivate({
      getHandler: () => handler,
      getClass: () => AdminOperationsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
    } as never);
    expect(allowed(['buyer'])).toBe(false);
    expect(allowed(['admin'])).toBe(true);
    expect(allowed(['moderator'])).toBe(true);
  });
});
