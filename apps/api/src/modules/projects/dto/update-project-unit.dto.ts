import { PartialType } from '@nestjs/swagger';
import { AddProjectUnitDto } from './add-project-unit.dto';

export class UpdateProjectUnitDto extends PartialType(AddProjectUnitDto) {}
