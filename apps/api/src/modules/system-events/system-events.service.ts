import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemEventsService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: { severity: string; source: string; message: string; detailsJson?: Record<string, unknown>; requestId?: string; entityType?: string; entityId?: string; userId?: string }) {
    return this.prisma.systemEvent.create({ data: { ...input, message: input.message.slice(0, 500), detailsJson: input.detailsJson as Prisma.InputJsonValue | undefined } }).catch(() => undefined);
  }

  recent(limit = 100) { return this.prisma.systemEvent.findMany({ include: { user: { include: { profile: true } } }, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) }); }
  openCriticalCount() { return this.prisma.systemEvent.count({ where: { status: 'open', severity: { in: ['error', 'critical'] } } }); }
  resolve(id: string) { return this.prisma.systemEvent.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date() } }); }
}
