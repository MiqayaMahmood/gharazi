CREATE TABLE "system_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "severity" VARCHAR(16) NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "details_json" JSONB,
  "request_id" VARCHAR(120),
  "entity_type" VARCHAR(32),
  "entity_id" UUID,
  "user_id" UUID,
  "status" VARCHAR(16) NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  CONSTRAINT "system_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "system_events_status_severity_created_at_idx" ON "system_events"("status", "severity", "created_at");
CREATE INDEX "system_events_source_created_at_idx" ON "system_events"("source", "created_at");
CREATE INDEX "system_events_request_id_idx" ON "system_events"("request_id");
