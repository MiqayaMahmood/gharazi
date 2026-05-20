import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({ imports: [AuditModule], controllers: [CmsController], providers: [CmsService] })
export class CmsModule {}
