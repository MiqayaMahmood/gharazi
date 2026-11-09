ALTER TABLE "sch_gharazi"."promotion_activation_outbox"
  ADD COLUMN "notification_status" VARCHAR(24),
  ADD COLUMN "notification_attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "notification_generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "notification_claim_token" UUID,
  ADD COLUMN "notification_claimed_at" TIMESTAMPTZ(6),
  ADD COLUMN "notification_next_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN "notification_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "notification_last_error" VARCHAR(1000),
  ADD COLUMN "search_index_enqueued_at" TIMESTAMPTZ(6),
  ADD COLUMN "search_index_status" VARCHAR(24),
  ADD COLUMN "search_index_attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "search_index_generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "search_index_claim_token" UUID,
  ADD COLUMN "search_index_claimed_at" TIMESTAMPTZ(6),
  ADD COLUMN "search_index_next_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN "search_index_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "search_index_last_error" VARCHAR(1000);

CREATE INDEX "promo_act_outbox_notif_next_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("notification_status", "notification_next_attempt_at");
CREATE INDEX "promo_act_outbox_notif_claim_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("notification_status", "notification_claimed_at");
CREATE INDEX "promo_act_outbox_notif_queue_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("notification_status", "notification_enqueued_at");
CREATE INDEX "promo_act_outbox_search_next_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("search_index_status", "search_index_next_attempt_at");
CREATE INDEX "promo_act_outbox_search_claim_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("search_index_status", "search_index_claimed_at");
CREATE INDEX "promo_act_outbox_search_queue_idx"
  ON "sch_gharazi"."promotion_activation_outbox"("search_index_status", "search_index_enqueued_at");
