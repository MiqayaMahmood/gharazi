CREATE TABLE "favorites" (
  "user_id" UUID NOT NULL,
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id", "entity_type", "entity_id")
);

CREATE TABLE "saved_searches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "purpose_id" UUID,
  "property_type_id" UUID,
  "city_id" UUID,
  "area_id" UUID,
  "filters_json" JSONB NOT NULL DEFAULT '{}',
  "alert_enabled" BOOLEAN NOT NULL DEFAULT false,
  "last_alert_sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "notification_type" VARCHAR(64) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000),
  "payload_json" JSONB,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL,
  "channel" VARCHAR(32) NOT NULL,
  "delivery_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "provider_response" VARCHAR(1000),
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chats" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "context_type" VARCHAR(32) NOT NULL,
  "listing_id" UUID,
  "project_id" UUID,
  "initiated_by_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "last_message_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chats_context_check" CHECK (
    ("context_type" = 'listing' AND "listing_id" IS NOT NULL AND "project_id" IS NULL)
    OR ("context_type" = 'project' AND "project_id" IS NOT NULL AND "listing_id" IS NULL)
    OR ("context_type" = 'general' AND "listing_id" IS NULL AND "project_id" IS NULL)
  )
);

CREATE TABLE "chat_participants" (
  "chat_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_read_at" TIMESTAMPTZ(6),
  "is_muted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("chat_id", "user_id")
);

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chat_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "message_type" VARCHAR(32) NOT NULL DEFAULT 'text',
  "body" VARCHAR(4000),
  "attachment_url" VARCHAR(1000),
  "is_flagged" BOOLEAN NOT NULL DEFAULT false,
  "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMPTZ(6),
  "read_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inquiries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listing_id" UUID,
  "project_id" UUID,
  "buyer_user_id" UUID NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "chat_id" UUID,
  "inquiry_type" VARCHAR(32) NOT NULL DEFAULT 'general',
  "first_message" VARCHAR(2000),
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "responded_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inquiries_entity_check" CHECK (
    ("listing_id" IS NOT NULL AND "project_id" IS NULL)
    OR ("listing_id" IS NULL AND "project_id" IS NOT NULL)
  )
);

CREATE TABLE "verification_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "verification_type" VARCHAR(32) NOT NULL,
  "submitted_data_json" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "rejection_reason" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporter_user_id" UUID NOT NULL,
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "reason_code" VARCHAR(64) NOT NULL,
  "description" VARCHAR(1000),
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "assigned_to_user_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "action_type" VARCHAR(64) NOT NULL,
  "reason" VARCHAR(1000),
  "performed_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duplicate_candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_listing_id" UUID NOT NULL,
  "matched_listing_id" UUID NOT NULL,
  "score" DECIMAL(5,4) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ(6),
  CONSTRAINT "duplicate_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "favorites_entity_type_entity_id_idx" ON "favorites"("entity_type", "entity_id");
CREATE INDEX "saved_searches_user_id_alert_enabled_idx" ON "saved_searches"("user_id", "alert_enabled");
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");
CREATE INDEX "chats_initiated_by_user_id_recipient_user_id_idx" ON "chats"("initiated_by_user_id", "recipient_user_id");
CREATE INDEX "chats_listing_id_idx" ON "chats"("listing_id");
CREATE INDEX "chats_project_id_idx" ON "chats"("project_id");
CREATE INDEX "chat_participants_user_id_idx" ON "chat_participants"("user_id");
CREATE INDEX "chat_messages_chat_id_sent_at_idx" ON "chat_messages"("chat_id", "sent_at");
CREATE UNIQUE INDEX "inquiries_chat_id_key" ON "inquiries"("chat_id");
CREATE INDEX "inquiries_buyer_user_id_status_idx" ON "inquiries"("buyer_user_id", "status");
CREATE INDEX "inquiries_recipient_user_id_status_idx" ON "inquiries"("recipient_user_id", "status");
CREATE INDEX "verification_requests_user_id_status_idx" ON "verification_requests"("user_id", "status");
CREATE INDEX "reports_entity_type_entity_id_idx" ON "reports"("entity_type", "entity_id");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "moderation_actions_entity_type_entity_id_idx" ON "moderation_actions"("entity_type", "entity_id");
CREATE UNIQUE INDEX "duplicate_candidates_source_listing_id_matched_listing_id_key" ON "duplicate_candidates"("source_listing_id", "matched_listing_id");
CREATE INDEX "duplicate_candidates_status_idx" ON "duplicate_candidates"("status");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_purpose_id_fkey" FOREIGN KEY ("purpose_id") REFERENCES "listing_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chats" ADD CONSTRAINT "chats_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chats" ADD CONSTRAINT "chats_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chats" ADD CONSTRAINT "chats_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chats" ADD CONSTRAINT "chats_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_source_listing_id_fkey" FOREIGN KEY ("source_listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_matched_listing_id_fkey" FOREIGN KEY ("matched_listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
