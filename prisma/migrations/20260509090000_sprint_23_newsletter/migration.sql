CREATE TABLE "newsletter_subscribers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(120),
  "city" VARCHAR(120),
  "interests_json" JSONB,
  "source_page" VARCHAR(500),
  "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  "confirmed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
CREATE INDEX "newsletter_subscribers_status_created_at_idx" ON "newsletter_subscribers"("status", "created_at");
CREATE INDEX "newsletter_subscribers_city_idx" ON "newsletter_subscribers"("city");
