import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  create(userId: string, dto: CreateVerificationRequestDto) {
    return this.prisma.verificationRequest.create({
      data: {
        userId,
        verificationType: dto.verificationType,
        submittedDataJson: dto.submittedDataJson as Prisma.InputJsonValue,
      },
    });
  }

  mine(userId: string) {
    return this.prisma.verificationRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async review(id: string, reviewerUserId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const request = await this.prisma.verificationRequest.update({
      where: { id },
      data: { status, reviewedByUserId: reviewerUserId, reviewedAt: new Date(), rejectionReason },
    });
    await this.notifications.create({
      userId: request.userId,
      notificationType: 'verification_status_updated',
      title: 'Verification status updated',
      body: `Your ${request.verificationType} verification was ${status}.`,
      payloadJson: { verificationRequestId: id, status },
      queueDelivery: true,
    });
    return request;
  }
}
