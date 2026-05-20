import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { InquiriesService } from './inquiries.service';

@ApiTags('inquiries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(user.id, dto);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.inquiriesService.mine(user.id);
  }

  @Patch(':id/status')
  status(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInquiryStatusDto) {
    return this.inquiriesService.updateStatus(user.id, id, dto.status);
  }
}
