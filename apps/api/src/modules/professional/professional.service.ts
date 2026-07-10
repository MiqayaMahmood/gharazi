import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DevelopersService } from '../developers/developers.service';
import { CreateProfessionalProfileDto, UpdateProfessionalProfileDto } from './dto/professional-profile.dto';

@Injectable()
export class ProfessionalService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly developers: DevelopersService) {}

  me(userId: string) { return this.prisma.professionalProfile.findUnique({ where: { userId }, include: { city: true } }); }

  async create(userId: string, dto: CreateProfessionalProfileDto) {
    if (await this.prisma.professionalProfile.findUnique({ where: { userId } })) throw new ConflictException('Professional profile already exists');
    await this.assertCity(dto.cityId);
    const profile = await this.prisma.professionalProfile.create({ data: { ...this.clean(dto), userId }, include: { city: true } });
    await this.ensureDeveloperProfile(userId, dto);
    return profile;
  }

  async update(userId: string, dto: UpdateProfessionalProfileDto) {
    const existing = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('Professional profile was not found');
    await this.assertCity(dto.cityId);
    const changedIdentity = dto.businessName !== undefined || dto.businessType !== undefined;
    const profile = await this.prisma.professionalProfile.update({ where: { userId }, data: { ...this.clean(dto), verificationStatus: changedIdentity && existing.verificationStatus === 'verified' ? 'unverified' : undefined }, include: { city: true } });
    await this.ensureDeveloperProfile(userId, { ...existing, ...dto });
    return profile;
  }

  async requestVerification(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Complete your professional profile first');
    if (profile.verificationStatus === 'pending') throw new ConflictException('Verification is already pending');
    if (profile.verificationStatus === 'verified') throw new ConflictException('Professional profile is already verified');
    const request = await this.prisma.verificationRequest.create({ data: { userId, verificationType: 'company', submittedDataJson: { professionalProfileId: profile.id, businessName: profile.businessName, businessType: profile.businessType } } });
    await this.prisma.professionalProfile.update({ where: { id: profile.id }, data: { verificationStatus: 'pending', rejectionReason: null } });
    return request;
  }

  async limits(userId: string) {
    const [profile, roles, subscription, activeListingsUsed, activeProjectsUsed] = await Promise.all([
      this.me(userId), this.roleCodes(userId), this.activeSubscription(userId),
      this.prisma.listing.count({ where: { deletedAt: null, status: 'active', OR: [{ ownerUserId: userId }, { managedByUserId: userId }] } }),
      this.prisma.project.count({ where: { deletedAt: null, status: 'active', developer: { ownerUserId: userId } } }),
    ]);
    const professional = Boolean(profile) || roles.some((role) => ['agent', 'developer', 'admin'].includes(role));
    const canCreateProject = profile?.businessType === 'developer_builder' || roles.includes('developer');
    return { activeListingLimit: professional ? 25 : 2, activeProjectLimit: canCreateProject ? 5 : 0, activeListingsUsed, activeProjectsUsed, packageCode: subscription?.packageCode ?? subscription?.plan.code ?? profile?.packageCode ?? null, canCreateProject, enforcement: 'informational' };
  }

  async summary(userId: string) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const [profile, roles, subscription, quota, listings, projects, inquiries, chats, promotions] = await Promise.all([
      this.me(userId), this.roleCodes(userId), this.activeSubscription(userId), this.limits(userId),
      this.prisma.listing.findMany({ where: { deletedAt: null, OR: [{ ownerUserId: userId }, { managedByUserId: userId }] }, select: { id: true, publicId: true, title: true, status: true, viewCount: true, inquiryCount: true, isFeatured: true, isHot: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.project.findMany({ where: { deletedAt: null, developer: { ownerUserId: userId } }, select: { id: true, publicId: true, slug: true, name: true, status: true, isFeatured: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.inquiry.findMany({ where: { recipientUserId: userId }, select: { id: true, status: true, createdAt: true, listing: { select: { id: true, title: true, publicId: true } }, project: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.chat.findMany({ where: { participants: { some: { userId } } }, include: { participants: { where: { userId } }, listing: { select: { title: true, publicId: true } }, project: { select: { name: true, slug: true } } }, orderBy: { lastMessageAt: 'desc' }, take: 10 }),
      this.prisma.promotion.findMany({ where: { purchasedByUserId: userId, status: 'active', endsAt: { gt: new Date() } }, orderBy: { endsAt: 'asc' } }),
    ]);
    const listingIds = listings.map((x) => x.id); const projectIds = projects.map((x) => x.id);
    const [listingStats, projectStats, saves, inquiriesThisMonth, messagesThisMonth] = await Promise.all([
      this.prisma.listingDailyStat.aggregate({ where: { listingId: { in: listingIds }, statDate: { gte: monthStart } }, _sum: { viewsCount: true, inquiriesCount: true, savesCount: true } }),
      this.prisma.projectDailyStat.aggregate({ where: { projectId: { in: projectIds }, statDate: { gte: monthStart } }, _sum: { viewsCount: true, inquiriesCount: true, savesCount: true } }),
      this.prisma.favorite.count({ where: { createdAt: { gte: monthStart }, OR: [{ entityType: 'listing', entityId: { in: listingIds } }, { entityType: 'project', entityId: { in: projectIds } }] } }),
      this.prisma.inquiry.count({ where: { recipientUserId: userId, createdAt: { gte: monthStart } } }),
      this.prisma.chatMessage.count({ where: { sentAt: { gte: monthStart }, chat: { OR: [{ recipientUserId: userId }, { initiatedByUserId: userId }] }, NOT: { senderUserId: userId } } }),
    ]);
    const unreadChats = chats.filter((chat) => chat.lastMessageAt && (!chat.participants[0]?.lastReadAt || chat.lastMessageAt > chat.participants[0].lastReadAt)).length;
    return {
      eligible: Boolean(profile) || roles.some((role) => ['agent', 'developer', 'admin'].includes(role)), profile, verificationStatus: profile?.verificationStatus ?? 'unverified', profileCompletion: this.completion(profile), subscription, quota,
      counts: { activeListings: listings.filter((x) => x.status === 'active').length, draftListings: listings.filter((x) => x.status === 'draft').length, closedListings: listings.filter((x) => ['archived', 'sold', 'rented'].includes(x.status)).length, activeProjects: projects.filter((x) => x.status === 'active').length, unreadChats },
      metrics: { viewsThisMonth: (listingStats._sum.viewsCount ?? 0) + (projectStats._sum.viewsCount ?? 0), inquiriesThisMonth: Math.max(inquiriesThisMonth, (listingStats._sum.inquiriesCount ?? 0) + (projectStats._sum.inquiriesCount ?? 0)), messagesThisMonth, favoritesThisMonth: Math.max(saves, (listingStats._sum.savesCount ?? 0) + (projectStats._sum.savesCount ?? 0)) },
      recentLeads: inquiries, recentChats: chats.map((chat) => ({ id: chat.id, contextType: chat.contextType, lastMessageAt: chat.lastMessageAt, listing: chat.listing, project: chat.project })), recentListings: listings.slice(0, 5), recentProjects: projects.slice(0, 5), promotedItems: promotions,
    };
  }

  listAdmin(status?: string) {
    return this.prisma.professionalProfile.findMany({
      where: { verificationStatus: status },
      include: { city: true, user: { include: { profile: true, subscriptions: { where: { status: { in: ['active', 'trialing'] } }, include: { plan: true }, take: 1 }, ownedDevelopers: { include: { _count: { select: { projects: true } } } }, _count: { select: { ownedListings: true } } } } },
      orderBy: { updatedAt: 'desc' }, take: 200,
    });
  }

  adminGet(id: string) {
    return this.prisma.professionalProfile.findUniqueOrThrow({
      where: { id },
      include: { city: true, user: { include: { profile: true, roles: { include: { role: true } }, ownedListings: { take: 10 }, ownedDevelopers: { include: { projects: { take: 10 } } }, subscriptions: { include: { plan: true } } } } },
    });
  }

  async review(id: string, reviewerUserId: string, status: 'verified' | 'rejected', reason?: string) {
    if (status === 'rejected' && !reason?.trim()) throw new BadRequestException('Rejection reason is required');
    const profile = await this.prisma.professionalProfile.update({ where: { id }, data: { verificationStatus: status, rejectionReason: status === 'rejected' ? reason : null } });
    await this.prisma.verificationRequest.updateMany({ where: { userId: profile.userId, verificationType: 'company', status: 'pending' }, data: { status: status === 'verified' ? 'approved' : 'rejected', rejectionReason: reason, reviewedAt: new Date(), reviewedByUserId: reviewerUserId } });
    await this.notifications.create({ userId: profile.userId, notificationType: 'professional_verification_updated', title: `Business profile ${status}`, body: status === 'rejected' ? reason : 'Your professional business profile is verified.', payloadJson: { professionalProfileId: id, status }, queueDelivery: true });
    return profile;
  }

  private activeSubscription(userId: string) { return this.prisma.userSubscription.findFirst({ where: { userId, status: { in: ['active', 'trial', 'trialing'] }, OR: [{ endAt: null }, { endAt: { gt: new Date() } }] }, include: { plan: true }, orderBy: { createdAt: 'desc' } }); }
  private async roleCodes(userId: string) { return (await this.prisma.userRole.findMany({ where: { userId }, include: { role: true } })).map((x) => x.role.code.toLowerCase()); }
  private completion(profile: Awaited<ReturnType<ProfessionalService['me']>>) { if (!profile) return 0; const fields = [profile.businessName, profile.businessType, profile.contactPersonName, profile.phone, profile.email, profile.whatsapp, profile.websiteUrl, profile.cityId, profile.addressLine, profile.description, profile.logoUrl]; return Math.round(fields.filter(Boolean).length / fields.length * 100); }
  private clean<T extends CreateProfessionalProfileDto | UpdateProfessionalProfileDto>(dto: T) { return Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || undefined : value])) as Prisma.ProfessionalProfileUncheckedCreateInput; }
  private async assertCity(cityId?: string) { if (cityId && !(await this.prisma.city.findUnique({ where: { id: cityId } }))) throw new BadRequestException('Selected city was not found'); }
  private async ensureDeveloperProfile(userId: string, input: { businessType?: string; businessName?: string; logoUrl?: string | null; websiteUrl?: string | null; addressLine?: string | null; phone?: string; description?: string | null }) {
    if (input.businessType !== 'developer_builder' || !input.businessName) return;
    if (await this.prisma.developer.findUnique({ where: { ownerUserId: userId } })) return;
    await this.developers.createProfile(userId, { companyName: input.businessName, logoUrl: input.logoUrl ?? undefined, websiteUrl: input.websiteUrl ?? undefined, officeAddress: input.addressLine ?? undefined, supportPhone: input.phone, description: input.description ?? undefined });
  }
}
