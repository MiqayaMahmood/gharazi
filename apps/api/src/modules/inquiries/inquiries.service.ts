import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatService } from '../chat/chat.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(userId: string, dto: CreateInquiryDto) {
    if (!!dto.listingId === !!dto.projectId) throw new BadRequestException('Provide either listingId or projectId');
    const target = dto.listingId
      ? await this.prisma.listing.findUniqueOrThrow({ where: { id: dto.listingId } })
      : await this.prisma.project.findUniqueOrThrow({ where: { id: dto.projectId } });
    const recipientUserId =
      'ownerUserId' in target
        ? target.ownerUserId
        : (await this.prisma.developer.findUniqueOrThrow({ where: { id: target.developerId } })).ownerUserId;
    if (recipientUserId === userId) throw new BadRequestException('Self-inquiries are not allowed');
    const chat = dto.createChat
      ? await this.chat.createThread({
          contextType: dto.listingId ? 'listing' : 'project',
          listingId: dto.listingId,
          projectId: dto.projectId,
          initiatedByUserId: userId,
          recipientUserId,
          firstMessage: dto.firstMessage,
        })
      : undefined;
    const inquiry = await this.prisma.inquiry.create({
      data: {
        listingId: dto.listingId,
        projectId: dto.projectId,
        buyerUserId: userId,
        recipientUserId,
        chatId: chat?.id,
        inquiryType: dto.inquiryType ?? 'general',
        firstMessage: dto.firstMessage,
      },
    });
    await this.notifications.create({
      userId: recipientUserId,
      notificationType: 'inquiry_received',
      title: 'New inquiry received',
      body: dto.firstMessage,
      payloadJson: { inquiryId: inquiry.id },
      queueDelivery: true,
    });
    await this.analytics.record({
      eventType: 'inquiry_created',
      entityType: dto.listingId ? 'listing' : 'project',
      entityId: dto.listingId ?? dto.projectId,
      userId,
    });
    return inquiry;
  }

  mine(userId: string) {
    return this.prisma.inquiry.findMany({
      where: { OR: [{ buyerUserId: userId }, { recipientUserId: userId }] },
      include: { listing: true, project: true, chat: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, id: string, status: string) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry was not found');
    if (inquiry.buyerUserId !== userId && inquiry.recipientUserId !== userId) {
      throw new ForbiddenException('Inquiry is not available for this user');
    }
    return this.prisma.inquiry.update({
      where: { id },
      data: { status, respondedAt: status === 'responded' ? new Date() : inquiry.respondedAt },
    });
  }
}
