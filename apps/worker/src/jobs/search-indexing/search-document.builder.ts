import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SearchDocumentBuilder implements OnModuleDestroy {
  private readonly logger = new Logger(SearchDocumentBuilder.name);
  private readonly prisma = new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  async buildListingDocument(listingId: string, publicId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        city: true,
        area: true,
        purpose: true,
        propertyType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        amenities: { include: { amenity: true } },
      },
    });
    if (!listing) {
      this.logger.warn(`Listing ${listingId} was queued for indexing but no longer exists`);
      return null;
    }

    return {
      entity: 'listing',
      id: listingId,
      publicId: listing.publicId ?? publicId,
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
      purposeCode: listing.purpose.code,
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
      amenities: listing.amenities.map((item) => item.amenity.name),
      geoLocation: listing.latitude && listing.longitude ? { lat: Number(listing.latitude), lon: Number(listing.longitude) } : undefined,
      publishedAt: listing.publishedAt?.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      indexedAt: new Date().toISOString(),
    };
  }

  async buildProjectDocument(projectId: string, publicId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        developer: true,
        city: true,
        area: true,
        projectType: true,
        media: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        amenities: { include: { amenity: true } },
        units: { include: { propertyType: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!project) {
      this.logger.warn(`Project ${projectId} was queued for indexing but no longer exists`);
      return null;
    }

    return {
      entity: 'project',
      id: projectId,
      publicId: project.publicId ?? publicId,
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
      amenities: project.amenities.map((item) => item.amenity.name),
      units: project.units.map((unit) => ({
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
