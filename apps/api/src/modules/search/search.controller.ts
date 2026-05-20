import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import { SearchProjectsQueryDto } from './dto/search-projects-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  listings(@Query() query: SearchListingsQueryDto) {
    return this.searchService.searchListings(query);
  }

  @Get('projects')
  projects(@Query() query: SearchProjectsQueryDto) {
    return this.searchService.searchProjects(query);
  }

  @Get('areas/autocomplete')
  areas(@Query('q') q = '') {
    return this.searchService.autocompleteAreas(q);
  }

  @Get('listings/:id/similar')
  similarListings(@Param('id') id: string) {
    return this.searchService.similarListings(id);
  }

  @Get('projects/:id/similar')
  similarProjects(@Param('id') id: string) {
    return this.searchService.similarProjects(id);
  }
}
