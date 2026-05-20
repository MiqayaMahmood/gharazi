import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  plans() {
    return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceAmount: 'asc' } });
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: dto.planId } });
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + (plan.billingInterval === 'yearly' ? 12 : 1));
    const subscription = await this.prisma.userSubscription.create({
      data: { userId, planId: dto.planId, startAt, endAt, autoRenew: dto.autoRenew ?? false, paymentProvider: dto.paymentProvider, externalReference: dto.externalReference },
      include: { plan: true },
    });
    await this.audit.record({ actorUserId: userId, action: 'subscription.create', entityType: 'subscription', entityId: subscription.id });
    return subscription;
  }

  mine(userId: string) {
    return this.prisma.userSubscription.findMany({ where: { userId }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
  }

  async cancel(userId: string, id: string) {
    const subscription = await this.prisma.userSubscription.findFirst({ where: { id, userId } });
    if (!subscription) throw new NotFoundException('Subscription was not found');
    const updated = await this.prisma.userSubscription.update({ where: { id }, data: { status: 'canceled', autoRenew: false } });
    await this.audit.record({ actorUserId: userId, action: 'subscription.cancel', entityType: 'subscription', entityId: id });
    return updated;
  }

  async hasEntitlement(userId: string, featureCode: string): Promise<boolean> {
    const subscriptions = await this.prisma.userSubscription.findMany({
      where: { userId, status: { in: ['active', 'trial'] }, OR: [{ endAt: null }, { endAt: { gt: new Date() } }] },
      include: { plan: true },
    });
    return subscriptions.some((subscription) => {
      const features = subscription.plan.featuresJson as Record<string, unknown>;
      return Boolean(features[featureCode]);
    });
  }
}
