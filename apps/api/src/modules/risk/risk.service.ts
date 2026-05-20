import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRiskFlagDto } from './dto/create-risk-flag.dto';
import { UpdateRiskFlagDto } from './dto/update-risk-flag.dto';

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(actorUserId: string, dto: CreateRiskFlagDto) {
    const flag = await this.prisma.riskFlag.create({
      data: { ...dto, severity: dto.severity ?? 'medium', createdByUserId: actorUserId },
    });
    await this.audit.record({ actorUserId, action: 'risk.flag.create', entityType: dto.entityType, entityId: dto.entityId, metadataJson: { riskFlagId: flag.id } });
    return flag;
  }

  list(filters: { status?: string; entityType?: string }) {
    return this.prisma.riskFlag.findMany({ where: filters, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async update(actorUserId: string, id: string, dto: UpdateRiskFlagDto) {
    const flag = await this.prisma.riskFlag.update({ where: { id }, data: dto });
    await this.audit.record({ actorUserId, action: 'risk.flag.update', entityType: flag.entityType, entityId: flag.entityId, metadataJson: { riskFlagId: id, ...dto } });
    return flag;
  }
}
