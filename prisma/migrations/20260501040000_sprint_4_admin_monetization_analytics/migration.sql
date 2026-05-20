CREATE TABLE "subscription_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "billing_interval" VARCHAR(32) NOT NULL,
  "price_amount" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
  "features_json" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  "start_at" TIMESTAMPTZ(6) NOT NULL,
  "end_at" TIMESTAMPTZ(6),
  "auto_renew" BOOLEAN NOT NULL DEFAULT false,
  "payment_provider" VARCHAR(64),
  "external_reference" VARCHAR(120),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "promotion_type" VARCHAR(32) NOT NULL,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  "purchased_by_user_id" UUID NOT NULL,
  "notes" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cms_pages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(180) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "content_json" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ(6),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blog_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(220) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "excerpt" VARCHAR(500),
  "content_json" JSONB NOT NULL,
  "cover_image_url" VARCHAR(500),
  "author_user_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_daily_stats" (
  "listing_id" UUID NOT NULL,
  "stat_date" DATE NOT NULL,
  "views_count" INTEGER NOT NULL DEFAULT 0,
  "unique_views_count" INTEGER NOT NULL DEFAULT 0,
  "chats_started_count" INTEGER NOT NULL DEFAULT 0,
  "inquiries_count" INTEGER NOT NULL DEFAULT 0,
  "saves_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "listing_daily_stats_pkey" PRIMARY KEY ("listing_id", "stat_date")
);

CREATE TABLE "project_daily_stats" (
  "project_id" UUID NOT NULL,
  "stat_date" DATE NOT NULL,
  "views_count" INTEGER NOT NULL DEFAULT 0,
  "inquiries_count" INTEGER NOT NULL DEFAULT 0,
  "saves_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "project_daily_stats_pkey" PRIMARY KEY ("project_id", "stat_date")
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "action" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(32),
  "entity_id" UUID,
  "metadata_json" JSONB,
  "ip_address" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX "subscription_plans_is_active_billing_interval_idx" ON "subscription_plans"("is_active", "billing_interval");
CREATE INDEX "user_subscriptions_user_id_status_idx" ON "user_subscriptions"("user_id", "status");
CREATE INDEX "user_subscriptions_plan_id_idx" ON "user_subscriptions"("plan_id");
CREATE INDEX "promotions_entity_type_entity_id_status_idx" ON "promotions"("entity_type", "entity_id", "status");
CREATE INDEX "promotions_purchased_by_user_id_status_idx" ON "promotions"("purchased_by_user_id", "status");
CREATE INDEX "promotions_starts_at_ends_at_status_idx" ON "promotions"("starts_at", "ends_at", "status");
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");
CREATE INDEX "cms_pages_status_published_at_idx" ON "cms_pages"("status", "published_at");
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "admin_notes_entity_type_entity_id_idx" ON "admin_notes"("entity_type", "entity_id");

ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_purchased_by_user_id_fkey" FOREIGN KEY ("purchased_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_daily_stats" ADD CONSTRAINT "listing_daily_stats_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_stats" ADD CONSTRAINT "project_daily_stats_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
