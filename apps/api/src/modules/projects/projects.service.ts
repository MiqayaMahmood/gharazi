import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { makePublicId, slugify } from '@Gharazi/shared-utils';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { PrismaService } from '../../database/prisma.service';
import { AddProjectMediaDto } from './dto/add-project-media.dto';
import { AddProjectUnitDto } from './dto/add-project-unit.dto';
import { AddProjectUpdateDto } from './dto/add-project-update.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectUnitDto } from './dto/update-project-unit.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexing: SearchIndexingService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`POST /projects create requested userId=${userId} cityId=${dto.cityId} areaId=${dto.areaId} projectTypeId=${dto.projectTypeId}`);
      }
      const developer = await this.getDeveloperForUser(userId);
      const { amenityIds, ...data } = dto;
      const project = await this.prisma.project.create({
        data: {
          ...this.projectCreateData(data),
          publicId: await this.uniquePublicId(),
          slug: await this.uniqueSlug(dto.name),
          developerId: developer.id,
          amenities: amenityIds?.length
            ? { create: amenityIds.map((amenityId) => ({ amenityId })) }
            : undefined,
        },
        include: this.detailInclude(),
      });

      return project;
    } catch (error) {
      this.logger.error(`POST /projects create failed userId=${userId}: ${this.errorSummary(error)}`);
      throw error;
    }
  }

  async listMine(userId: string) {
    const developer = await this.getDeveloperForUser(userId);
    return this.prisma.project.findMany({
      where: { developerId: developer.id, deletedAt: null },
      include: this.detailInclude(),
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPublic(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      include: this.detailInclude(),
    });

    if (!project) {
      throw new NotFoundException('Project was not found');
    }

    return project;
  }

  async batchPublic(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: uniqueIds }, status: 'active', deletedAt: null },
      include: this.detailInclude(),
    });
    const byId = new Map(projects.map((project) => [project.id, project]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.assertCanWrite(userId, id);
    const { amenityIds, ...data } = dto;

    const project = await this.prisma.$transaction(async (tx) => {
      if (amenityIds) {
        await tx.projectAmenity.deleteMany({ where: { projectId: id } });
        if (amenityIds.length) {
          await tx.projectAmenity.createMany({
            data: amenityIds.map((amenityId) => ({ projectId: id, amenityId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.project.update({
        where: { id },
        data: {
          ...this.projectUpdateData(data),
          ...(dto.name ? { slug: await this.uniqueSlug(dto.name, id) } : {}),
        },
        include: this.detailInclude(),
      });
    });

    if (project.status === 'active') {
      await this.indexing.indexProject(project.id, project.publicId);
    }

    return project;
  }

  async publish(userId: string, id: string) {
    const project = await this.assertCanWrite(userId, id);
    this.assertPublishable(project);
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        status: 'active',
        publishedAt: project.publishedAt ?? new Date(),
      },
      include: this.detailInclude(),
    });
    await this.indexing.indexProject(updated.id, updated.publicId);

    return updated;
  }

  async archive(userId: string, id: string) {
    const project = await this.assertCanWrite(userId, id);
    if (project.status === 'archived') {
      return project;
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
      include: this.detailInclude(),
    });
    await this.indexing.deleteProject(updated.id, updated.publicId);

    return updated;
  }

  async addUnit(userId: string, id: string, dto: AddProjectUnitDto) {
    await this.assertCanWrite(userId, id);
    const unit = await this.prisma.projectUnit.create({
      data: { projectId: id, ...dto },
    });
    await this.reindexIfActive(id);

    return unit;
  }

  async updateUnit(userId: string, id: string, unitId: string, dto: UpdateProjectUnitDto) {
    await this.assertCanWrite(userId, id);
    const unit = await this.prisma.projectUnit.update({
      where: { id: unitId, projectId: id },
      data: dto,
    });
    await this.reindexIfActive(id);

    return unit;
  }

  async addMedia(userId: string, id: string, dto: AddProjectMediaDto) {
    await this.assertCanWrite(userId, id);
    const media = await this.prisma.projectMedia.create({
      data: { projectId: id, ...dto },
    });
    await this.reindexIfActive(id);

    return media;
  }

  async addUpdate(userId: string, id: string, dto: AddProjectUpdateDto) {
    await this.assertCanWrite(userId, id);
    const update = await this.prisma.projectUpdate.create({
      data: {
        projectId: id,
        title: dto.title,
        body: dto.body,
        progressPercent: dto.progressPercent,
        updateDate: new Date(dto.updateDate),
        publishedAt: dto.publish ? new Date() : undefined,
        createdByUserId: userId,
      },
    });
    await this.reindexIfActive(id);

    return update;
  }

  private async assertCanWrite(userId: string, id: string) {
    const developer = await this.getDeveloperForUser(userId);
    const project = await this.prisma.project.findFirst({
      where: { id, developerId: developer.id, deletedAt: null },
    });
    if (!project) {
      throw new ForbiddenException('Project is not available for this developer');
    }

    return project;
  }

  private async getDeveloperForUser(userId: string) {
    const developer = await this.prisma.developer.findUnique({ where: { ownerUserId: userId } });
    if (!developer) {
      throw new BadRequestException('Developer profile is required before creating or managing projects. Create a developer profile first.');
    }

    return developer;
  }

  private assertPublishable(project: { name: string; description: string; possessionStatus: string }) {
    if (!project.name || !project.description || !project.possessionStatus) {
      throw new UnprocessableEntityException('Project is missing required publish fields');
    }
  }

  private async reindexIfActive(id: string): Promise<void> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id } });
    if (project.status === 'active') {
      await this.indexing.indexProject(project.id, project.publicId);
    }
  }

  private projectCreateData(data: Omit<CreateProjectDto, 'amenityIds'>) {
    return {
      ...data,
      expectedHandoverDate: data.expectedHandoverDate ? new Date(data.expectedHandoverDate) : undefined,
      launchDate: data.launchDate ? new Date(data.launchDate) : undefined,
    };
  }

  private projectUpdateData(data: Partial<Omit<CreateProjectDto, 'amenityIds'>>) {
    return {
      ...data,
      expectedHandoverDate: data.expectedHandoverDate ? new Date(data.expectedHandoverDate) : undefined,
      launchDate: data.launchDate ? new Date(data.launchDate) : undefined,
    };
  }

  private async uniquePublicId(): Promise<string> {
    while (true) {
      const publicId = makePublicId('PRJ');
      const existing = await this.prisma.project.findUnique({ where: { publicId } });
      if (!existing) {
        return publicId;
      }
    }
  }

  private async uniqueSlug(name: string, ignoreId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.project.findUnique({ where: { slug } });
      if (!existing || existing.id === ignoreId) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }

  private detailInclude() {
    return {
      developer: true,
      city: true,
      area: true,
      projectType: true,
      units: { orderBy: { sortOrder: 'asc' as const }, include: { propertyType: true } },
      media: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
      amenities: { include: { amenity: true } },
      updates: { where: { publishedAt: { not: null } }, orderBy: { updateDate: 'desc' as const } },
    };
  }

  private errorSummary(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
