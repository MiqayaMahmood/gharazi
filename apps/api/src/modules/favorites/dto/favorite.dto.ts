import { IsIn, IsUUID } from 'class-validator';

export const FAVORITE_ENTITY_TYPES = ['listing', 'project', 'developer', 'area', 'blog'] as const;
export type FavoriteEntityType = (typeof FAVORITE_ENTITY_TYPES)[number];

export class FavoriteDto {
  @IsIn(FAVORITE_ENTITY_TYPES, { message: 'entityType must be one of: listing, project, developer, area, blog' })
  entityType: FavoriteEntityType;

  @IsUUID()
  entityId: string;
}
