import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChatGateway } from './chat.gateway';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: ChatGateway,
    private readonly analytics: AnalyticsService,
  ) {}

  async createThread(input: {
    contextType: 'listing' | 'project' | 'general';
    listingId?: string;
    projectId?: string;
    initiatedByUserId: string;
    recipientUserId: string;
    firstMessage?: string;
  }) {
    const chat = await this.prisma.chat.create({
      data: {
        contextType: input.contextType,
        listingId: input.listingId,
        projectId: input.projectId,
        initiatedByUserId: input.initiatedByUserId,
        recipientUserId: input.recipientUserId,
        participants: {
          create: [{ userId: input.initiatedByUserId }, { userId: input.recipientUserId }],
        },
      },
    });
    if (input.firstMessage) {
      await this.sendMessage(input.initiatedByUserId, chat.id, { body: input.firstMessage });
    }
    await this.analytics.record({ eventType: 'chat_started', entityType: 'chat', entityId: chat.id, userId: input.initiatedByUserId });
    return chat;
  }

  list(userId: string) {
    return this.prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: true, messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async messages(userId: string, chatId: string) {
    await this.assertParticipant(userId, chatId);
    await this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    });
    return this.prisma.chatMessage.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { sentAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(userId: string, chatId: string, dto: CreateChatMessageDto) {
    await this.assertParticipant(userId, chatId);
    const message = await this.prisma.chatMessage.create({
      data: {
        chatId,
        senderUserId: userId,
        messageType: dto.messageType ?? 'text',
        body: dto.body,
        attachmentUrl: dto.attachmentUrl,
      },
    });
    await this.prisma.chat.update({ where: { id: chatId }, data: { lastMessageAt: message.sentAt } });
    const chat = await this.prisma.chat.findUniqueOrThrow({ where: { id: chatId } });
    const recipientId = chat.initiatedByUserId === userId ? chat.recipientUserId : chat.initiatedByUserId;
    await this.notifications.create({
      userId: recipientId,
      notificationType: 'chat_message_received',
      title: 'New message received',
      body: dto.body,
      payloadJson: { chatId, messageId: message.id },
      queueDelivery: true,
    });
    this.gateway.emitMessage(chatId, message);
    await this.analytics.record({ eventType: 'chat_message_sent', entityType: 'chat', entityId: chatId, userId });
    return message;
  }

  private async assertParticipant(userId: string, chatId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) {
      const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat) throw new NotFoundException('Chat was not found');
      throw new ForbiddenException('Chat is not available for this user');
    }
  }
}
