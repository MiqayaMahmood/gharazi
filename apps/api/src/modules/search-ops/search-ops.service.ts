import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QUEUES, SearchIndexingJobPayload } from '@Gharazi/shared-events';
import { Queue } from 'bullmq';
import { ElasticsearchService } from '../../common/elasticsearch/elasticsearch.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SwapAliasDto } from './dto/swap-alias.dto';

@Injectable()
export class SearchOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUES.searchIndexing) private readonly queue: Queue<SearchIndexingJobPayload>,
  ) {}

  async bootstrap(actorUserId: string) {
    await this.elasticsearch.ensureCoreIndices();
    const status = await this.status();
    await this.audit.record({ actorUserId, action: 'search.bootstrap', metadataJson: { status: status.status } });
    return { bootstrapped: true, ...status };
  }

  async reindexListings(actorUserId: string) {
    await this.elasticsearch.ensureCoreIndices();
    const listings = await this.prisma.listing.findMany({
      where: { status: 'active', deletedAt: null },
      include: {
        city: true,
        area: true,
        purpose: true,
        propertyType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        amenities: { include: { amenity: true } },
      },
    });
    const result = await this.bulkIndex('listings', listings.map((listing) => ({ id: listing.id, document: this.listingDocument(listing) })));
    await this.audit.record({ actorUserId, action: 'search.reindex.listings', metadataJson: result });
    return result;
  }

  async reindexProjects(actorUserId: string) {
    await this.elasticsearch.ensureCoreIndices();
    const projects = await this.prisma.project.findMany({
      where: { status: 'active', deletedAt: null },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        amenities: { include: { amenity: true } },
        units: { include: { propertyType: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    const result = await this.bulkIndex('projects', projects.map((project) => ({ id: project.id, document: this.projectDocument(project) })));
    await this.audit.record({ actorUserId, action: 'search.reindex.projects', metadataJson: result });
    return result;
  }

  async reindexAreas(actorUserId: string) {
    await this.elasticsearch.ensureCoreIndices();
    const areas = await this.prisma.area.findMany({ where: { isActive: true }, include: { city: true } });
    const result = await this.bulkIndex(
      'areas',
      areas.map((area) => ({
        id: area.id,
        document: {
          id: area.id,
          name: area.name,
          slug: area.slug,
          cityId: area.cityId,
          cityName: area.city.name,
          citySlug: area.city.slug,
          searchText: `${area.name} ${area.city.name}`,
        },
      })),
    );
    await this.audit.record({ actorUserId, action: 'search.reindex.areas', metadataJson: result });
    return result;
  }

  async reindexListing(actorUserId: string, id: string) {
    const listing = await this.prisma.listing.findUniqueOrThrow({ where: { id } });
    const type = listing.status === 'active' && !listing.deletedAt ? 'index-listing' : 'delete-listing';
    await this.queue.add(type, { type, entityId: listing.id, publicId: listing.publicId });
    await this.audit.record({ actorUserId, action: 'search.repair.listing', entityType: 'listing', entityId: id });
    return { queued: true, type };
  }

  async reindexProject(actorUserId: string, id: string) {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id } });
    const type = project.status === 'active' && !project.deletedAt ? 'index-project' : 'delete-project';
    await this.queue.add(type, { type, entityId: project.id, publicId: project.publicId });
    await this.audit.record({ actorUserId, action: 'search.repair.project', entityType: 'project', entityId: id });
    return { queued: true, type };
  }

  async swapAlias(actorUserId: string, dto: SwapAliasDto) {
    const alias = this.elasticsearch.alias(dto.alias);
    const existing = await this.elasticsearch.client.indices.getAlias({ name: alias }, { ignore: [404] });
    const actions: Array<Record<string, unknown>> = [];
    if (!('statusCode' in existing)) {
      for (const index of Object.keys(existing)) actions.push({ remove: { index, alias } });
    }
    actions.push({ add: { index: dto.targetIndex, alias, is_write_index: true } });
    await this.elasticsearch.client.indices.updateAliases({ actions });
    await this.audit.record({
      actorUserId,
      action: 'search.alias.swap',
      metadataJson: { alias: dto.alias, targetIndex: dto.targetIndex },
    });
    return { alias, targetIndex: dto.targetIndex };
  }

  async status() {
    const aliases = {
      listings: this.elasticsearch.alias('listings'),
      projects: this.elasticsearch.alias('projects'),
      areas: this.elasticsearch.alias('areas'),
    };

    let elasticsearch: { ok: boolean; status: 'ok' | 'degraded'; error?: string } = { ok: true, status: 'ok' };
    let indices: Record<string, unknown> = {};
    try {
      await this.elasticsearch.client.ping();
      indices = {
        listings: await this.indexStatus('listings'),
        projects: await this.indexStatus('projects'),
        areas: await this.indexStatus('areas'),
      };
      const missing = Object.values(indices).some((item: any) => !item.aliasExists || !item.indexExists);
      if (missing) elasticsearch = { ok: false, status: 'degraded', error: 'One or more search aliases or physical indices are missing.' };
    } catch (error) {
      elasticsearch = {
        ok: false,
        status: 'degraded',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    let queue: { ok: boolean; waiting?: number; failed?: number; status: 'ok' | 'degraded'; error?: string };
    try {
      queue = {
        ok: true,
        status: 'ok',
        waiting: await this.queue.getWaitingCount(),
        failed: await this.queue.getFailedCount(),
      };
    } catch (error) {
      queue = {
        ok: false,
        status: 'degraded',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      ok: elasticsearch.ok && queue.ok,
      status: elasticsearch.ok && queue.ok ? 'ok' : 'degraded',
      elasticsearch,
      aliases,
      indices,
      nextAction: elasticsearch.ok ? undefined : 'Run POST /admin/search/bootstrap',
      queue,
    };
  }

  private async indexStatus(name: 'listings' | 'projects' | 'areas') {
    const alias = this.elasticsearch.alias(name);
    const physicalIndex = this.elasticsearch.physicalIndex(name);
    const [aliasExists, indexExists] = await Promise.all([
      this.elasticsearch.client.indices.existsAlias({ name: alias }),
      this.elasticsearch.client.indices.exists({ index: physicalIndex }),
    ]);
    let count: number | undefined;
    if (aliasExists) {
      const response = await this.elasticsearch.client.count({ index: alias }).catch(() => undefined);
      count = response?.count;
    }
    return { alias, physicalIndex, aliasExists, indexExists, count };
  }

  private async bulkIndex(aliasName: 'listings' | 'projects' | 'areas', documents: Array<{ id: string; document: Record<string, unknown> }>) {
    if (!documents.length) return { indexed: 0, failures: [] };
    const index = this.elasticsearch.alias(aliasName);
    const operations = documents.flatMap((item) => [{ index: { _index: index, _id: item.id } }, item.document]);
    const response = await this.elasticsearch.client.bulk({
      operations,
      refresh: process.env.NODE_ENV !== 'production',
    });
    const failures = response.items
      .map((item: any, position) => {
        const result = item.index;
        return result?.error ? { id: documents[position]?.id, error: result.error } : null;
      })
      .filter(Boolean);
    return { indexed: documents.length - failures.length, attempted: documents.length, failures };
  }

  private listingDocument(listing: any) {
    return {
      entity: 'listing',
      id: listing.id,
      publicId: listing.publicId,
      title: listing.title,
      description: listing.description,
      status: listing.status,
      cityId: listing.cityId,
      cityName: listing.city.name,
      citySlug: listing.city.slug,
      areaId: listing.areaId,
      areaName: listing.area.name,
      areaSlug: listing.area.slug,
      purposeId: listing.purposeId,
      purposeSlug: listing.purpose.slug,
      purposeName: listing.purpose.name,
      propertyTypeId: listing.propertyTypeId,
      propertyTypeCode: listing.propertyType.code,
      propertyTypeName: listing.propertyType.name,
      priceAmount: Number(listing.priceAmount),
      areaValue: Number(listing.areaValue),
      areaUnit: listing.areaUnit,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      furnishedStatus: listing.furnishedStatus,
      possessionStatus: listing.possessionStatus,
      verificationStatus: listing.verificationStatus,
      isFeatured: listing.isFeatured,
      isHot: listing.isHot,
      coverImageUrl: listing.media[0]?.url,
      amenities: listing.amenities.map((item: any) => item.amenity.name),
      geoLocation: listing.latitude && listing.longitude ? { lat: Number(listing.latitude), lon: Number(listing.longitude) } : undefined,
      publishedAt: listing.publishedAt?.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      indexedAt: new Date().toISOString(),
    };
  }

  private projectDocument(project: any) {
    return {
      entity: 'project',
      id: project.id,
      publicId: project.publicId,
      slug: project.slug,
      name: project.name,
      description: project.description,
      developerName: project.developer.companyName,
      status: project.status,
      cityId: project.cityId,
      cityName: project.city.name,
      citySlug: project.city.slug,
      areaId: project.areaId,
      areaName: project.area.name,
      areaSlug: project.area.slug,
      projectTypeId: project.projectTypeId,
      projectTypeCode: project.projectType.code,
      projectTypeName: project.projectType.name,
      possessionStatus: project.possessionStatus,
      legalStatus: project.legalStatus,
      verificationStatus: project.verificationStatus,
      isFeatured: project.isFeatured,
      minPriceAmount: project.minPriceAmount ? Number(project.minPriceAmount) : undefined,
      maxPriceAmount: project.maxPriceAmount ? Number(project.maxPriceAmount) : undefined,
      paymentPlanSummary: project.paymentPlanSummary,
      coverImageUrl: project.media[0]?.url,
      amenities: project.amenities.map((item: any) => item.amenity.name),
      units: project.units.map((unit: any) => ({
        id: unit.id,
        type: unit.propertyType.name,
        size: unit.areaValue && unit.areaUnit ? `${Number(unit.areaValue)} ${unit.areaUnit}` : '',
        price: unit.minPriceAmount ? Number(unit.minPriceAmount) : undefined,
      })),
      geoLocation: project.latitude && project.longitude ? { lat: Number(project.latitude), lon: Number(project.longitude) } : undefined,
      launchDate: project.launchDate?.toISOString(),
      expectedHandoverDate: project.expectedHandoverDate?.toISOString(),
      publishedAt: project.publishedAt?.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      indexedAt: new Date().toISOString(),
    };
  }
}
