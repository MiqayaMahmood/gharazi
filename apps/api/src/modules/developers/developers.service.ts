import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '@Gharazi/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { CreateDeveloperProfileDto } from './dto/create-developer-profile.dto';
import { UpdateDeveloperProfileDto } from './dto/update-developer-profile.dto';

@Injectable()
export class DevelopersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateDeveloperProfileDto) {
    const existing = await this.prisma.developer.findUnique({ where: { ownerUserId: userId } });
    if (existing) {
      throw new ConflictException('Developer profile already exists for this user');
    }

    const slug = await this.uniqueSlug(dto.companyName);
    return this.prisma.developer.create({
      data: {
        ownerUserId: userId,
        slug,
        ...dto,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateDeveloperProfileDto) {
    const developer = await this.getMine(userId);
    const slug = dto.companyName ? await this.uniqueSlug(dto.companyName, developer.id) : undefined;

    return this.prisma.developer.update({
      where: { id: developer.id },
      data: {
        ...dto,
        ...(slug ? { slug } : {}),
        verificationStatus: dto.companyName ? 'pending' : developer.verificationStatus,
      },
    });
  }

  async getMine(userId: string) {
    const developer = await this.prisma.developer.findUnique({ where: { ownerUserId: userId } });
    if (!developer) {
      throw new NotFoundException('Developer profile was not found');
    }

    return developer;
  }

  async getBySlug(slug: string) {
    return this.prisma.developer.findUniqueOrThrow({
      where: { slug },
      include: {
        projects: {
          where: { status: 'active', deletedAt: null },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });
  }

  async assertOwner(developerId: string, userId: string): Promise<void> {
    const developer = await this.prisma.developer.findUniqueOrThrow({ where: { id: developerId } });
    if (developer.ownerUserId !== userId) {
      throw new NotFoundException('Developer-owned resource was not found');
    }
  }

  private async uniqueSlug(companyName: string, ignoreId?: string): Promise<string> {
    const base = slugify(companyName);
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.developer.findUnique({ where: { slug } });
      if (!existing || existing.id === ignoreId) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }
}
