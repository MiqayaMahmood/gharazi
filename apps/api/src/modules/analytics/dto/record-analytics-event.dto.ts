import { IsDateString, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordAnalyticsEventDto {
  @IsIn([
    'listing_viewed',
    'project_viewed',
    'developer_viewed',
    'area_viewed',
    'blog_viewed',
    'tool_viewed',
    'listing_favorited',
    'project_favorited',
    'developer_favorited',
    'area_favorited',
    'inquiry_created',
    'chat_started',
    'chat_message_sent',
    'promotion_activated',
    'subscription_started',
    'subscription_canceled',
  ])
  eventType: string;

  @IsOptional() @IsString() @MaxLength(32) entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsString() @MaxLength(120) sessionId?: string;
  @IsOptional() @IsString() @MaxLength(120) anonymousId?: string;
  @IsOptional() @IsString() @MaxLength(160) idempotencyKey?: string;
  @IsOptional() @IsObject() metadataJson?: Record<string, unknown>;
  @IsOptional() @IsDateString() occurredAt?: string;
}
