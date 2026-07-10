import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevelopersModule } from '../developers/developers.module';
import { ProfessionalController } from './professional.controller';
import { ProfessionalService } from './professional.service';
@Module({ imports: [NotificationsModule, DevelopersModule], controllers: [ProfessionalController], providers: [ProfessionalService], exports: [ProfessionalService] })
export class ProfessionalModule {}
