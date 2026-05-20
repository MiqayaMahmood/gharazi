import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BaseSubmissionDto } from './dto/create-submission.dto';

type SubmissionType = 'feedback' | 'contact' | 'support';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly jwt: JwtService,
  ) {}

  async create(type: SubmissionType, dto: BaseSubmissionDto, token?: string) {
    this.assertNotSpam(dto);
    const userId = await this.optionalUserId(token);
    const submission = await this.prisma.inboundSubmission.create({
      data: {
        submissionType: type,
        status: 'new',
        priority: 'priority' in dto && typeof dto.priority === 'string' ? dto.priority : 'normal',
        channel: dto.channel ?? (type === 'support' ? 'widget' : type === 'contact' ? 'contact_page' : 'web'),
        category: dto.category,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message.trim(),
        sourcePage: dto.sourcePage,
        userId,
        metadataJson: { userAgentCaptured: false } as Prisma.InputJsonValue,
      },
    });

    await this.audit.record({
      actorUserId: userId,
      action: `inbound_submission.${type}.created`,
      entityType: 'inbound_submission',
      entityId: submission.id,
    });
    await this.notifyAdmins(submission.id, type, dto.subject ?? dto.category ?? 'New submission');
    return { ok: true, id: submission.id, status: submission.status };
  }

  list(filters: { submissionType?: string; status?: string; q?: string; from?: string; to?: string }) {
    return this.prisma.inboundSubmission.findMany({
      where: {
        submissionType: filters.submissionType || undefined,
        status: filters.status || undefined,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
        OR: filters.q
          ? [
              { subject: { contains: filters.q, mode: 'insensitive' } },
              { name: { contains: filters.q, mode: 'insensitive' } },
              { email: { contains: filters.q, mode: 'insensitive' } },
              { message: { contains: filters.q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: string) {
    const submission = await this.prisma.inboundSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('Submission was not found');
    return submission;
  }

  async updateStatus(actorUserId: string, id: string, status: string, adminNotes?: string) {
    await this.get(id);
    const submission = await this.prisma.inboundSubmission.update({
      where: { id },
      data: {
        status,
        adminNotes,
        resolvedAt: ['resolved', 'dismissed'].includes(status) ? new Date() : null,
      },
    });
    await this.audit.record({
      actorUserId,
      action: `inbound_submission.status.${status}`,
      entityType: 'inbound_submission',
      entityId: id,
      metadataJson: { adminNotes },
    });
    return submission;
  }

  async assign(actorUserId: string, id: string, assignedToUserId: string, adminNotes?: string) {
    await this.get(id);
    const submission = await this.prisma.inboundSubmission.update({
      where: { id },
      data: { assignedToUserId, status: 'in_progress', adminNotes },
    });
    await this.audit.record({
      actorUserId,
      action: 'inbound_submission.assign',
      entityType: 'inbound_submission',
      entityId: id,
      metadataJson: { assignedToUserId, adminNotes },
    });
    await this.notifications.create({
      userId: assignedToUserId,
      notificationType: 'support_submission_assigned',
      title: 'Support submission assigned',
      body: submission.subject ?? submission.message.slice(0, 160),
      payloadJson: { submissionId: id },
      queueDelivery: true,
    });
    return submission;
  }

  private assertNotSpam(dto: BaseSubmissionDto) {
    if (dto.website) throw new BadRequestException('Submission was rejected');
    if (!dto.message?.trim()) throw new BadRequestException('Message is required');
  }

  private async optionalUserId(token?: string) {
    if (!token) return undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  private async notifyAdmins(submissionId: string, type: SubmissionType, title: string) {
    const admins = await this.prisma.user.findMany({
      where: { roles: { some: { role: { code: { in: ['admin', 'moderator', 'support'] } } } } },
      select: { id: true },
      take: 20,
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create({
          userId: admin.id,
          notificationType: 'inbound_submission_created',
          title: `New ${type} submission`,
          body: title,
          payloadJson: { submissionId, submissionType: type },
          queueDelivery: true,
        }),
      ),
    );
  }
}
