import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: { ...dto, userId, filtersJson: dto.filtersJson as Prisma.InputJsonValue },
    });
  }

  list(userId: string) {
    return this.prisma.savedSearch.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    await this.assertOwner(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...dto,
        filtersJson: dto.filtersJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  private async assertOwner(userId: string, id: string) {
    const saved = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!saved) throw new NotFoundException('Saved search was not found');
  }
}
