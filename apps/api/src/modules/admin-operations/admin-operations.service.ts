import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RiskService } from '../risk/risk.service';
import { AdminNoteDto } from './dto/admin-note.dto';
import { CreateRiskFlagDto } from '../risk/dto/create-risk-flag.dto';
import { UpdateRiskFlagDto } from '../risk/dto/update-risk-flag.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { RollupDto } from './dto/rollup.dto';
import { PaymentsService } from '../payments/payments.service';
import { PromotionsService } from '../promotions/promotions.service';
import { SystemEventsService } from '../system-events/system-events.service';
import { AdminRoleDto, CreateAdminUserDto } from './dto/admin-users.dto';
import { ListingContactUpdatesQueryDto, UpdateListingContactDto } from './dto/listing-contact-update.dto';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly indexing: SearchIndexingService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly risk: RiskService,
    private readonly analytics: AnalyticsService,
    private readonly paymentsService: PaymentsService,
    private readonly promotionsService: PromotionsService,
    private readonly systemEvents: SystemEventsService,
  ) {}

  async overview() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [users, listings, projects, reports, verificationRequests, openCriticalAlerts, paymentFailuresToday, recentErrors] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.project.count(),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.verificationRequest.count({ where: { status: 'pending' } }),
      this.systemEvents.openCriticalCount(),
      this.prisma.paymentTransaction.count({ where: { status: 'failed', updatedAt: { gte: today } } }),
      this.prisma.systemEvent.findMany({ where: { severity: { in: ['error', 'critical'] } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    return { users, listings, projects, openReports: reports, pendingVerificationRequests: verificationRequests, openCriticalAlerts, paymentFailuresToday, recentErrors };
  }

  reports(filters: { status?: string; entityType?: string; reasonCode?: string }) {
    return this.prisma.report.findMany({ where: filters, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  verificationRequests() { return this.prisma.verificationRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }
  auditLogs(limit: number) { return this.audit.list(limit); }

  async analyticsSummary(input: { range?: string; from?: string; to?: string } = {}) {
    const period = this.resolveDateRange(input);
    const statWhere = { statDate: { gte: period.from, lt: period.to } };
    const createdWhere = { createdAt: { gte: period.from, lt: period.to } };
    const publishedWhere = { publishedAt: { gte: period.from, lt: period.to } };
    const [listingViews, projectViews, activePromotions, activeSubscriptions, counts, events, pendingReports, pendingVerificationRequests, topListings, topProjects] = await Promise.all([
      this.prisma.listingDailyStat.aggregate({ where: statWhere, _sum: { viewsCount: true, inquiriesCount: true, savesCount: true, chatsStartedCount: true } }),
      this.prisma.projectDailyStat.aggregate({ where: statWhere, _sum: { viewsCount: true, inquiriesCount: true, savesCount: true } }),
      this.prisma.promotion.count({ where: { status: 'active' } }),
      this.prisma.userSubscription.count({ where: { status: { in: ['active', 'trial'] } } }),
      this.periodCounts(createdWhere, publishedWhere),
      this.periodEvents(period.from, period.to),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.verificationRequest.count({ where: { status: 'pending' } }),
      this.topViewedListings(period.from, period.to),
      this.topViewedProjects(period.from, period.to),
    ]);
    return {
      range: period.label,
      from: period.from,
      to: period.to,
      ...counts,
      listingStats: listingViews._sum,
      projectStats: projectViews._sum,
      listingViews: listingViews._sum.viewsCount ?? 0,
      projectViews: projectViews._sum.viewsCount ?? 0,
      listingInquiries: listingViews._sum.inquiriesCount ?? 0,
      projectInquiries: projectViews._sum.inquiriesCount ?? 0,
      chatsStarted: listingViews._sum.chatsStartedCount ?? 0,
      favoritesCreated: events.favoritesCreated,
      chatMessagesSent: events.chatMessagesSent,
      activePromotions,
      activeSubscriptions,
      pendingReports,
      pendingVerificationRequests,
      topListings,
      topProjects,
    };
  }

  async reviewVerification(actorUserId: string, id: string, status: 'approved' | 'rejected', reason?: string) {
    const request = await this.prisma.verificationRequest.update({
      where: { id },
      data: { status, reviewedByUserId: actorUserId, reviewedAt: new Date(), rejectionReason: reason },
    });
    await this.notifications.create({
      userId: request.userId,
      notificationType: `verification_${status}`,
      title: `Verification ${status}`,
      body: reason,
      payloadJson: { verificationRequestId: id },
      queueDelivery: true,
    });
    await this.audit.record({ actorUserId, action: `verification.${status}`, entityType: 'verification_request', entityId: id, metadataJson: { reason } });
    return request;
  }

  async reviewListing(actorUserId: string, id: string, decision: 'approved' | 'rejected', reason?: string) {
    const listing = await this.prisma.listing.update({
      where: { id },
      data: { verificationStatus: decision === 'approved' ? 'verified' : 'rejected', status: decision === 'rejected' ? 'rejected' : undefined },
    });
    if (decision === 'rejected') await this.indexing.deleteListing(listing.id, listing.publicId);
    else if (listing.status === 'active') await this.indexing.indexListing(listing.id, listing.publicId);
    await this.notifications.create({ userId: listing.ownerUserId, notificationType: `listing_${decision}`, title: `Listing ${decision}`, body: reason, payloadJson: { listingId: id }, queueDelivery: true });
    await this.audit.record({ actorUserId, action: `listing.${decision}`, entityType: 'listing', entityId: id, metadataJson: { reason } });
    return listing;
  }

  async reviewProject(actorUserId: string, id: string, decision: 'approved' | 'rejected', reason?: string) {
    const project = await this.prisma.project.update({
      where: { id },
      data: { verificationStatus: decision === 'approved' ? 'verified' : 'rejected', status: decision === 'rejected' ? 'rejected' : undefined },
      include: { developer: true },
    });
    if (decision === 'rejected') await this.indexing.deleteProject(project.id, project.publicId);
    else if (project.status === 'active') await this.indexing.indexProject(project.id, project.publicId);
    await this.notifications.create({ userId: project.developer.ownerUserId, notificationType: `project_${decision}`, title: `Project ${decision}`, body: reason, payloadJson: { projectId: id }, queueDelivery: true });
    await this.audit.record({ actorUserId, action: `project.${decision}`, entityType: 'project', entityId: id, metadataJson: { reason } });
    return project;
  }

  async setUserStatus(actorUserId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.audit.record({ actorUserId, action: `user.${status === 'SUSPENDED' ? 'suspend' : 'unsuspend'}`, entityType: 'user', entityId: userId });
    return user;
  }

  async reviewReport(actorUserId: string, id: string, status: 'resolved' | 'dismissed', reason?: string) {
    const report = await this.prisma.report.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
    await this.audit.record({ actorUserId, action: `report.${status}`, entityType: 'report', entityId: id, metadataJson: { reason } });
    await this.notifications.create({ userId: report.reporterUserId, notificationType: `report_${status}`, title: `Report ${status}`, body: reason, payloadJson: { reportId: id }, queueDelivery: true });
    return report;
  }

  async reviewDuplicate(actorUserId: string, id: string, status: 'confirmed' | 'dismissed') {
    const duplicate = await this.prisma.duplicateCandidate.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
    await this.audit.record({ actorUserId, action: `duplicate.${status}`, entityType: 'duplicate_candidate', entityId: id });
    return duplicate;
  }

  async createNote(actorUserId: string, dto: AdminNoteDto) {
    const note = await this.prisma.adminNote.create({ data: { ...dto, createdByUserId: actorUserId } });
    await this.audit.record({ actorUserId, action: 'admin_note.create', entityType: dto.entityType, entityId: dto.entityId });
    return note;
  }

  notes(filters: { entityType?: string; entityId?: string }) {
    return this.prisma.adminNote.findMany({ where: filters, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  createRiskFlag(actorUserId: string, dto: CreateRiskFlagDto) { return this.risk.create(actorUserId, dto); }
  riskFlags(filters: { status?: string; entityType?: string }) { return this.risk.list(filters); }
  updateRiskFlag(actorUserId: string, id: string, dto: UpdateRiskFlagDto) { return this.risk.update(actorUserId, id, dto); }

  async runRollups(dto: RollupDto) {
    const date = dto.statDate ? new Date(dto.statDate) : new Date();
    const scope = dto.scope ?? 'all';
    return {
      listings: scope === 'listings' || scope === 'all' ? await this.analytics.rollupListingsForDate(date) : undefined,
      projects: scope === 'projects' || scope === 'all' ? await this.analytics.rollupProjectsForDate(date) : undefined,
    };
  }

  async rollupStatus() {
    const latestListing = await this.prisma.listingDailyStat.findFirst({ orderBy: { statDate: 'desc' } });
    const latestProject = await this.prisma.projectDailyStat.findFirst({ orderBy: { statDate: 'desc' } });
    return { latestListingStatDate: latestListing?.statDate, latestProjectStatDate: latestProject?.statDate };
  }

  async dataIntegrityCheck() {
    const [activeListings, activeProjects, invalidListings, invalidProjects, orphanFavorites] = await Promise.all([
      this.prisma.listing.findMany({
        where: { status: 'active', deletedAt: null },
        select: { id: true, publicId: true },
        take: 500,
      }),
      this.prisma.project.findMany({
        where: { status: 'active', deletedAt: null },
        select: { id: true, publicId: true },
        take: 500,
      }),
      this.prisma.listing.findMany({
        where: { status: 'active', publishedAt: null },
        select: { id: true, publicId: true, status: true, publishedAt: true },
        take: 100,
      }),
      this.prisma.project.findMany({
        where: { status: 'active', publishedAt: null },
        select: { id: true, publicId: true, status: true, publishedAt: true },
        take: 100,
      }),
      this.findOrphanFavorites(),
    ]);

    const [missingListingIndex, missingProjectIndex] = await Promise.all([
      this.missingIndexDocuments('listings', activeListings),
      this.missingIndexDocuments('projects', activeProjects),
    ]);

    return {
      checkedAt: new Date().toISOString(),
      missingListingIndex,
      missingProjectIndex,
      invalidListings,
      invalidProjects,
      orphanFavorites,
      limits: { indexedEntitiesCheckedPerType: 500 },
    };
  }

  async dataIntegrityRepair(actorUserId: string) {
    const report = await this.dataIntegrityCheck();
    await Promise.all([
      ...report.missingListingIndex.map((listing) => this.indexing.indexListing(listing.id, listing.publicId)),
      ...report.missingProjectIndex.map((project) => this.indexing.indexProject(project.id, project.publicId)),
      ...report.invalidListings.map((listing) =>
        this.prisma.listing.update({ where: { id: listing.id }, data: { publishedAt: new Date() } }),
      ),
      ...report.invalidProjects.map((project) =>
        this.prisma.project.update({ where: { id: project.id }, data: { publishedAt: new Date() } }),
      ),
    ]);
    await this.audit.record({
      actorUserId,
      action: 'data_integrity.repair',
      entityType: 'system',
      entityId: actorUserId,
      metadataJson: report,
    });
    return { ok: true, queuedListingReindexes: report.missingListingIndex.length, queuedProjectReindexes: report.missingProjectIndex.length };
  }

  payments() { return this.paymentsService.listAdmin(); }

  listings(filters: { status?: string }) {
    return this.prisma.listing.findMany({
      where: { status: filters.status },
      include: {
        ownerUser: { include: { profile: true } },
        city: true,
        area: true,
        propertyType: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async listingContactUpdates(query: ListingContactUpdatesQueryDto = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 1000);
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
      ...(query.filter === 'missing'
        ? {
            OR: [
              { contactName: null },
              { contactName: '' },
              { contactPhone: null },
              { contactPhone: '' },
              { contactWhatsapp: null },
              { contactWhatsapp: '' },
            ],
          }
        : {}),
    };
    const search = query.q?.trim();
    if (search) {
      const q: Prisma.ListingWhereInput = {
        OR: [
          { publicId: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { contactPhone: { contains: search, mode: 'insensitive' } },
          { contactWhatsapp: { contains: search, mode: 'insensitive' } },
          { city: { name: { contains: search, mode: 'insensitive' } } },
          { area: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), q];
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        select: this.listingContactSelect(),
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: items.map((listing) => this.mapListingContactUpdate(listing)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async updateListingContact(actorUserId: string, id: string, dto: UpdateListingContactDto) {
    const data: Prisma.ListingUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(dto, 'contactName')) data.contactName = this.nullableTrim(dto.contactName);
    if (Object.prototype.hasOwnProperty.call(dto, 'contactPhone')) data.contactPhone = this.normalizeContactNumber(dto.contactPhone, 'contactPhone');
    if (Object.prototype.hasOwnProperty.call(dto, 'contactWhatsapp')) data.contactWhatsapp = this.normalizeContactNumber(dto.contactWhatsapp, 'contactWhatsapp');

    const updated = await this.prisma.listing.update({
      where: { id },
      data,
      select: this.listingContactSelect(),
    });

    await this.audit.record({
      actorUserId,
      action: 'listing.contact_update',
      entityType: 'listing',
      entityId: id,
      metadataJson: {
        fields: Object.keys(data),
        publicId: updated.publicId,
      },
    });

    return this.mapListingContactUpdate(updated);
  }

  projects(filters: { status?: string }) {
    return this.prisma.project.findMany({
      where: { status: filters.status },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  promotions(filters: { status?: string }) {
    return this.prisma.promotion.findMany({
      where: { status: filters.status },
      include: { purchasedByUser: { include: { profile: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  subscriptions(filters: { status?: string }) {
    return this.prisma.userSubscription.findMany({
      where: { status: filters.status },
      include: { user: { include: { profile: true } }, plan: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  cmsPages() {
    return this.prisma.cmsPage.findMany({
      include: { createdByUser: { include: { profile: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  blogPosts() {
    return this.prisma.blogPost.findMany({
      include: { authorUser: { include: { profile: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  users() {
    return this.prisma.user.findMany({
      include: { profile: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  user(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, include: { profile: true, roles: { include: { role: true } } } });
  }

  async createAdminUser(actorUserId: string, dto: CreateAdminUserDto) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phoneNumber: dto.phoneNumber,
        passwordHash: await bcrypt.hash(dto.password, 12),
        status: 'ACTIVE',
        profile: { create: { fullName: dto.fullName, preferredLanguage: 'en' } },
        roles: { create: { roleId: role.id } },
      },
      include: { profile: true, roles: { include: { role: true } } },
    });
    await this.audit.record({ actorUserId, action: 'user.create_admin', entityType: 'user', entityId: user.id });
    return user;
  }

  async addUserRole(actorUserId: string, userId: string, dto: AdminRoleDto) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: dto.roleCode } });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
    await this.audit.record({ actorUserId, action: 'user.role.add', entityType: 'user', entityId: userId, metadataJson: { roleCode: dto.roleCode } });
    return this.user(userId);
  }

  async removeUserRole(actorUserId: string, userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    await this.audit.record({ actorUserId, action: 'user.role.remove', entityType: 'user', entityId: userId, metadataJson: { roleId } });
    return this.user(userId);
  }

  async reconcilePayment(actorUserId: string, id: string) {
    const result = await this.paymentsService.reconcile(id);
    await this.audit.record({ actorUserId, action: 'payment.reconcile', entityType: 'payment_transaction', entityId: id });
    return result;
  }

  async expirePromotions(actorUserId: string) {
    const result = await this.promotionsService.endExpiredPromotions();
    await this.audit.record({ actorUserId, action: 'promotion.expiry.repair', entityType: 'promotion', metadataJson: result });
    return result;
  }

  systemEventsList(limit?: number) { return this.systemEvents.recent(limit); }
  async resolveSystemEvent(actorUserId: string, id: string) { const event = await this.systemEvents.resolve(id); await this.audit.record({ actorUserId, action: 'system_event.resolve', entityType: 'system_event', entityId: id }); return event; }

  private async missingIndexDocuments(alias: 'listings' | 'projects', entities: Array<{ id: string; publicId: string }>) {
    const index = this.elasticsearch.alias(alias);
    const checks = await Promise.all(
      entities.map(async (entity) => {
        try {
          const exists = await this.elasticsearch.client.exists({ index, id: entity.id });
          return exists ? null : entity;
        } catch {
          return entity;
        }
      }),
    );
    return checks.filter((entity): entity is { id: string; publicId: string } => Boolean(entity));
  }

  private async findOrphanFavorites() {
    const favorites = await this.prisma.favorite.findMany({ take: 500 });
    const [listingIds, projectIds] = await Promise.all([
      this.prisma.listing.findMany({
        where: { id: { in: favorites.filter((favorite) => favorite.entityType === 'listing').map((favorite) => favorite.entityId) } },
        select: { id: true },
      }),
      this.prisma.project.findMany({
        where: { id: { in: favorites.filter((favorite) => favorite.entityType === 'project').map((favorite) => favorite.entityId) } },
        select: { id: true },
      }),
    ]);
    const validListings = new Set(listingIds.map((listing) => listing.id));
    const validProjects = new Set(projectIds.map((project) => project.id));
    return favorites.filter(
      (favorite) =>
        (favorite.entityType === 'listing' && !validListings.has(favorite.entityId)) ||
        (favorite.entityType === 'project' && !validProjects.has(favorite.entityId)),
    );
  }

  private resolveDateRange(input: { range?: string; from?: string; to?: string }) {
    const now = new Date();
    if (input.range === 'custom' && input.from && input.to) {
      return { label: 'custom', from: new Date(input.from), to: new Date(input.to) };
    }
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (input.range === 'today') return { label: 'today', from: startOfToday, to: now };
    if (input.range === 'last_7_days') {
      const from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 6);
      return { label: 'last_7_days', from, to: now };
    }
    if (input.range === 'previous_month') {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { label: 'previous_month', from, to };
    }
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { label: 'current_month', from, to: now };
  }

  private async periodCounts(createdWhere: { createdAt: { gte: Date; lt: Date } }, publishedWhere: { publishedAt: { gte: Date; lt: Date } }) {
    const [newUsers, newListings, newProjects, publishedListings, publishedProjects, submissions, advertisingInquiries, newsletterSubscribers] = await Promise.all([
      this.prisma.user.count({ where: createdWhere }),
      this.prisma.listing.count({ where: createdWhere }),
      this.prisma.project.count({ where: createdWhere }),
      this.prisma.listing.count({ where: publishedWhere }),
      this.prisma.project.count({ where: publishedWhere }),
      this.prisma.inboundSubmission.count({ where: createdWhere }),
      this.prisma.inboundSubmission.count({ where: { ...createdWhere, category: 'advertising' } }),
      this.prisma.newsletterSubscriber.count({ where: createdWhere }),
    ]);
    return { newUsers, newListings, newProjects, publishedListings, publishedProjects, submissions, advertisingInquiries, newsletterSubscribers };
  }

  private async periodEvents(from: Date, to: Date) {
    const [favoritesCreated, chatMessagesSent] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { occurredAt: { gte: from, lt: to }, eventType: { in: ['listing_favorited', 'project_favorited', 'developer_favorited', 'area_favorited'] } } }),
      this.prisma.analyticsEvent.count({ where: { occurredAt: { gte: from, lt: to }, eventType: 'chat_message_sent' } }),
    ]);
    return { favoritesCreated, chatMessagesSent };
  }

  private async topViewedListings(from: Date, to: Date) {
    const rows = await this.prisma.listingDailyStat.groupBy({
      by: ['listingId'],
      where: { statDate: { gte: from, lt: to } },
      _sum: { viewsCount: true, savesCount: true },
      orderBy: { _sum: { viewsCount: 'desc' } },
      take: 5,
    });
    const listings = await this.prisma.listing.findMany({ where: { id: { in: rows.map((row) => row.listingId) } }, select: { id: true, publicId: true, title: true } });
    const lookup = new Map(listings.map((listing) => [listing.id, listing]));
    return rows.flatMap((row) => {
      const listing = lookup.get(row.listingId);
      return listing ? [{ ...listing, viewsCount: row._sum.viewsCount ?? 0, savesCount: row._sum.savesCount ?? 0 }] : [];
    });
  }

  private async topViewedProjects(from: Date, to: Date) {
    const rows = await this.prisma.projectDailyStat.groupBy({
      by: ['projectId'],
      where: { statDate: { gte: from, lt: to } },
      _sum: { viewsCount: true, savesCount: true },
      orderBy: { _sum: { viewsCount: 'desc' } },
      take: 5,
    });
    const projects = await this.prisma.project.findMany({ where: { id: { in: rows.map((row) => row.projectId) } }, select: { id: true, slug: true, name: true } });
    const lookup = new Map(projects.map((project) => [project.id, project]));
    return rows.flatMap((row) => {
      const project = lookup.get(row.projectId);
      return project ? [{ ...project, viewsCount: row._sum.viewsCount ?? 0, savesCount: row._sum.savesCount ?? 0 }] : [];
    });
  }

  private listingContactSelect() {
    return {
      id: true,
      publicId: true,
      title: true,
      status: true,
      contactName: true,
      contactPhone: true,
      contactWhatsapp: true,
      sourceUrl: true,
      updatedAt: true,
      city: { select: { name: true } },
      area: { select: { name: true } },
    } as const;
  }

  private mapListingContactUpdate(listing: Prisma.ListingGetPayload<{ select: ReturnType<AdminOperationsService['listingContactSelect']> }>) {
    return {
      id: listing.id,
      publicId: listing.publicId,
      title: listing.title,
      cityName: listing.city?.name ?? null,
      areaName: listing.area?.name ?? null,
      status: listing.status,
      contactName: listing.contactName,
      contactPhone: listing.contactPhone,
      contactWhatsapp: listing.contactWhatsapp,
      sourceUrl: listing.sourceUrl,
      updatedAt: listing.updatedAt,
    };
  }

  private nullableTrim(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizeContactNumber(value: string | null | undefined, field: string) {
    const trimmed = this.nullableTrim(value);
    if (trimmed === null) return null;
    if (trimmed.length < 7 || trimmed.length > 32) {
      throw new BadRequestException(`${field} must be between 7 and 32 characters`);
    }
    return trimmed;
  }
}
