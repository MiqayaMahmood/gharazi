import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { MockPaymentProvider } from './mock-payment.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockPaymentProvider,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const provider = this.provider(dto.provider ?? 'mock');
    const amount = await this.resolveAmount(dto.entityType, dto.entityId, userId);
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        provider: provider.code,
        amount,
        currency: 'PKR',
        metadataJson: { source: 'checkout' },
      },
    });
    const session = await provider.createCheckout({
      transactionId: transaction.id,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      description: `${dto.entityType} payment`,
    });
    await this.prisma.paymentAttempt.create({
      data: {
        transactionId: transaction.id,
        userId,
        provider: provider.code,
        requestJson: { entityType: dto.entityType, entityId: dto.entityId } as Prisma.InputJsonValue,
        responseJson: session.raw as Prisma.InputJsonValue,
      },
    });
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerReference: session.providerReference },
    });
    await this.audit.record({ actorUserId: userId, action: 'payment.checkout', entityType: 'payment_transaction', entityId: transaction.id });
    return { transactionId: transaction.id, checkoutUrl: session.checkoutUrl, providerReference: session.providerReference };
  }

  async handleWebhook(provider: string, dto: PaymentWebhookDto) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { provider, providerReference: dto.providerReference },
    });
    if (!transaction) throw new NotFoundException('Payment transaction was not found');
    if (transaction.status === dto.status && ['paid', 'failed', 'canceled', 'refunded'].includes(dto.status)) {
      return transaction;
    }
    this.assertPaymentTransition(transaction.status, dto.status);
    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: dto.status, metadataJson: dto.payload as Prisma.InputJsonValue | undefined },
    });
    await this.prisma.paymentAttempt.create({
      data: {
        transactionId: transaction.id,
        userId: transaction.userId,
        provider,
        status: dto.status,
        responseJson: dto.payload as Prisma.InputJsonValue | undefined,
      },
    });
    if (dto.status === 'paid') await this.applyPaidTransaction(updated.id);
    await this.notifications.create({
      userId: transaction.userId,
      notificationType: `payment_${dto.status}`,
      title: `Payment ${dto.status}`,
      payloadJson: { transactionId: transaction.id },
      queueDelivery: true,
    });
    return updated;
  }

  mine(userId: string) {
    return this.prisma.paymentTransaction.findMany({ where: { userId }, include: { attempts: true }, orderBy: { createdAt: 'desc' } });
  }

  async getMine(userId: string, id: string) {
    return this.prisma.paymentTransaction.findFirstOrThrow({ where: { id, userId }, include: { attempts: true } });
  }

  listAdmin() {
    return this.prisma.paymentTransaction.findMany({ include: { attempts: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async reconcile(id: string) {
    const transaction = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id } });
    if (transaction.status === 'paid') await this.applyPaidTransaction(transaction.id);
    return { ok: true, status: transaction.status };
  }

  private provider(code: string) {
    if (code === this.mockProvider.code) return this.mockProvider;
    throw new BadRequestException(`Unsupported payment provider: ${code}`);
  }

  private async resolveAmount(entityType: string, entityId: string, userId: string) {
    if (entityType === 'subscription') {
      const subscription = await this.prisma.userSubscription.findFirstOrThrow({ where: { id: entityId, userId }, include: { plan: true } });
      return subscription.plan.priceAmount;
    }
    const promotion = await this.prisma.promotion.findFirstOrThrow({ where: { id: entityId, purchasedByUserId: userId } });
    const days = Math.max(1, Math.ceil((promotion.endsAt.getTime() - promotion.startsAt.getTime()) / 86400000));
    return new Prisma.Decimal(days * 500);
  }

  private async applyPaidTransaction(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (transaction.entityType === 'subscription') {
      await this.prisma.userSubscription.update({ where: { id: transaction.entityId }, data: { status: 'active' } });
      await this.analytics.record({ eventType: 'subscription_started', entityType: 'subscription', entityId: transaction.entityId, userId: transaction.userId });
    }
    if (transaction.entityType === 'promotion') {
      await this.prisma.promotion.update({ where: { id: transaction.entityId }, data: { status: 'scheduled' } });
      await this.analytics.record({ eventType: 'promotion_paid', entityType: 'promotion', entityId: transaction.entityId, userId: transaction.userId });
    }
  }

  private assertPaymentTransition(current: string, next: string) {
    const terminal = ['paid', 'failed', 'refunded', 'canceled'];
    if (terminal.includes(current) && current !== next) {
      throw new BadRequestException(`Cannot transition payment from ${current} to ${next}`);
    }
  }
}
