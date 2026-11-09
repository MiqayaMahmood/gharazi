CREATE TABLE "sch_gharazi"."promotion_activation_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "promotion_id" UUID NOT NULL,
  "event_key" VARCHAR(128) NOT NULL,
  "notification_id" UUID,
  "notification_created_at" TIMESTAMPTZ(6),
  "notification_enqueued_at" TIMESTAMPTZ(6),
  "search_index_handled_at" TIMESTAMPTZ(6),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "claimed_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "last_error" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_activation_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_activation_outbox_promotion_id_fkey"
    FOREIGN KEY ("promotion_id") REFERENCES "sch_gharazi"."promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "promotion_activation_outbox_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "sch_gharazi"."notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "promotion_activation_outbox_promotion_id_key"
  ON "sch_gharazi"."promotion_activation_outbox"("promotion_id");
CREATE UNIQUE INDEX "promotion_activation_outbox_event_key_key"
  ON "sch_gharazi"."promotion_activation_outbox"("event_key");
CREATE UNIQUE INDEX "promotion_activation_outbox_notification_id_key"
  ON "sch_gharazi"."promotion_activation_outbox"("notification_id");
CREATE INDEX "promotion_activation_outbox_completed_at_created_at_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("completed_at", "created_at");
CREATE INDEX "promotion_activation_outbox_claimed_at_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("claimed_at");
