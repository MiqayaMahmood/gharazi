import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    actorUserId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadataJson?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...input,
        metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  list(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
