import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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

  @Get('queues')
  queues() {
    return this.healthService.queues();
  }

  @Get('search')
  search() {
    return this.healthService.search();
  }
}
