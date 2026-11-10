import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const ADMIN_EXPIRY_SIMULATION_SCENARIOS = ['A', 'B', 'C'] as const;
export type AdminExpirySimulationScenario = (typeof ADMIN_EXPIRY_SIMULATION_SCENARIOS)[number];

const ISO_TIMESTAMP_WITH_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/i;

export class AdminExpirySimulationQueryDto {
  @IsIn(ADMIN_EXPIRY_SIMULATION_SCENARIOS)
  scenario!: AdminExpirySimulationScenario;

  @IsDateString({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_ZONE, { message: 'cutoffAt must include a timezone offset or Z' })
  cutoffAt!: string;

  @IsDateString({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_ZONE, { message: 'evaluatedAt must include a timezone offset or Z' })
  evaluatedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
