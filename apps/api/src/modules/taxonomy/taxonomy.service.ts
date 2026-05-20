import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  listPropertyTypes() {
    return this.prisma.propertyType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listListingPurposes() {
    return this.prisma.listingPurpose.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAmenities() {
    return this.prisma.amenityDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
