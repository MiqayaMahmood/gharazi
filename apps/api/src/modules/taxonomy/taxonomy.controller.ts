import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TaxonomyService } from './taxonomy.service';

@ApiTags('taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get('property-types')
  propertyTypes() {
    return this.taxonomyService.listPropertyTypes();
  }

  @Get('purposes')
  purposes() {
    return this.taxonomyService.listListingPurposes();
  }

  @Get('amenities')
  amenities() {
    return this.taxonomyService.listAmenities();
  }
}
