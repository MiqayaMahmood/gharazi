import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RiskService } from './risk.service';

@Module({ imports: [AuditModule], providers: [RiskService], exports: [RiskService] })
export class RiskModule {}
