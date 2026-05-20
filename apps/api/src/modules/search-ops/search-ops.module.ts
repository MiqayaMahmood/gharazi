import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@Gharazi/shared-events';
import { AuditModule } from '../audit/audit.module';
import { SearchOpsController } from './search-ops.controller';
import { SearchOpsService } from './search-ops.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.searchIndexing }), AuditModule],
  controllers: [SearchOpsController],
  providers: [SearchOpsService],
})
export class SearchOpsModule {}
