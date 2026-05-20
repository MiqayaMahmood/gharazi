import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  listCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAreas(cityId?: string) {
    if (!cityId) {
      throw new BadRequestException('cityId query parameter is required');
    }

    return this.prisma.area.findMany({
      where: { cityId, isActive: true },
      include: { city: true, parentArea: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  getArea(id: string) {
    return this.prisma.area.findUniqueOrThrow({
      where: { id },
      include: { city: true, parentArea: true, childAreas: true },
    });
  }
}
