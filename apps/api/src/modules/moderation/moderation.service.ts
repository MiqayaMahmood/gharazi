import { Injectable } from '@nestjs/common';
import { SearchIndexingService } from '../../common/queues/search-indexing.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indexing: SearchIndexingService,
  ) {}

  report(reporterUserId: string, dto: CreateReportDto) {
    return this.prisma.report.create({ data: { reporterUserId, ...dto } });
  }

  async applyAction(input: {
    performedByUserId: string;
    entityType: string;
    entityId: string;
    actionType: string;
    reason?: string;
  }) {
    const action = await this.prisma.moderationAction.create({ data: input });
    if (input.actionType === 'hide' || input.actionType === 'reject') {
      if (input.entityType === 'listing') {
        const listing = await this.prisma.listing.update({
          where: { id: input.entityId },
          data: { status: 'rejected' },
        });
        await this.indexing.deleteListing(listing.id, listing.publicId);
      }
      if (input.entityType === 'project') {
        const project = await this.prisma.project.update({
          where: { id: input.entityId },
          data: { status: 'rejected' },
        });
        await this.indexing.deleteProject(project.id, project.publicId);
      }
    }
    return action;
  }

  createDuplicateCandidate(sourceListingId: string, matchedListingId: string, score: number) {
    return this.prisma.duplicateCandidate.upsert({
      where: { sourceListingId_matchedListingId: { sourceListingId, matchedListingId } },
      update: { score },
      create: { sourceListingId, matchedListingId, score },
    });
  }
}
