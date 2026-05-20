import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('cities')
  listCities() {
    return this.locationsService.listCities();
  }

  @Get('areas')
  listAreas(@Query('cityId') cityId?: string) {
    return this.locationsService.listAreas(cityId);
  }

  @Get('areas/:id')
  getArea(@Param('id') id: string) {
    return this.locationsService.getArea(id);
  }
}
