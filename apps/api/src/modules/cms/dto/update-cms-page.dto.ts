import { PartialType } from '@nestjs/swagger';
import { CreateCmsPageDto } from './create-cms-page.dto';

export class UpdateCmsPageDto extends PartialType(CreateCmsPageDto) {}
