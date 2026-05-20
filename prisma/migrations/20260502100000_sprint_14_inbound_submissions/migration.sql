CREATE TABLE IF NOT EXISTS "inbound_submissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_type" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'new',
  "priority" VARCHAR(32) NOT NULL DEFAULT 'normal',
  "channel" VARCHAR(32) NOT NULL DEFAULT 'web',
  "category" VARCHAR(64),
  "name" VARCHAR(120),
  "email" VARCHAR(255),
  "phone" VARCHAR(32),
  "subject" VARCHAR(180),
  "message" VARCHAR(3000) NOT NULL,
  "source_page" VARCHAR(500),
  "user_id" UUID,
  "assigned_to_user_id" UUID,
  "admin_notes" VARCHAR(2000),
  "metadata_json" JSONB,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inbound_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "inbound_submissions_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inbound_submissions_submission_type_status_created_at_idx" ON "inbound_submissions" ("submission_type", "status", "created_at");
CREATE INDEX IF NOT EXISTS "inbound_submissions_status_created_at_idx" ON "inbound_submissions" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "inbound_submissions_email_idx" ON "inbound_submissions" ("email");
CREATE INDEX IF NOT EXISTS "inbound_submissions_user_id_idx" ON "inbound_submissions" ("user_id");
CREATE INDEX IF NOT EXISTS "inbound_submissions_assigned_to_user_id_idx" ON "inbound_submissions" ("assigned_to_user_id");
