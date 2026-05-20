CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone_number" VARCHAR(32) NOT NULL,
  "email" VARCHAR(255),
  "phone_verified_at" TIMESTAMPTZ(6),
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(64) NOT NULL,
  "description" VARCHAR(255),
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "user_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "full_name" VARCHAR(120),
  "avatar_url" VARCHAR(500),
  "bio" VARCHAR(500),
  "preferred_language" VARCHAR(8) NOT NULL DEFAULT 'en',
  "whatsapp_number" VARCHAR(32),
  "company_name" VARCHAR(160),
  "website_url" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "province" VARCHAR(120),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "areas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "city_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_purposes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_purposes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "amenity_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "amenity_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");
CREATE INDEX "cities_is_active_sort_order_idx" ON "cities"("is_active", "sort_order");
CREATE UNIQUE INDEX "areas_city_id_slug_key" ON "areas"("city_id", "slug");
CREATE INDEX "areas_city_id_is_active_sort_order_idx" ON "areas"("city_id", "is_active", "sort_order");
CREATE UNIQUE INDEX "property_types_slug_key" ON "property_types"("slug");
CREATE INDEX "property_types_category_is_active_sort_order_idx" ON "property_types"("category", "is_active", "sort_order");
CREATE UNIQUE INDEX "listing_purposes_slug_key" ON "listing_purposes"("slug");
CREATE INDEX "listing_purposes_is_active_sort_order_idx" ON "listing_purposes"("is_active", "sort_order");
CREATE UNIQUE INDEX "amenity_definitions_slug_key" ON "amenity_definitions"("slug");
CREATE INDEX "amenity_definitions_category_is_active_sort_order_idx" ON "amenity_definitions"("category", "is_active", "sort_order");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
