-- Additive deduplication key for idempotent in-app listing expiry reminders.
-- Nullable so existing notifications remain unchanged and unrestricted.
ALTER TABLE "sch_gharazi"."notifications"
  ADD COLUMN "deduplication_key" VARCHAR(255);

CREATE UNIQUE INDEX "notifications_deduplication_key_key"
  ON "sch_gharazi"."notifications"("deduplication_key");
