import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { RequireRoles } from '../../common/auth/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    return this.healthService.ready();
  }

  @Get('dependencies')
  dependencies() {
    return this.healthService.dependencies();
  }

  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('admin', 'moderator')
  system() { return this.healthService.system(); }

  @Get('queues')
  queues() {
    return this.healthService.queues();
  }

  @Get('search')
  search() {
    return this.healthService.search();
  }
}
