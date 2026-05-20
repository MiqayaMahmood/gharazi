CREATE TABLE "developers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "company_name" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "registration_number" VARCHAR(120),
  "verification_status" VARCHAR(32) NOT NULL DEFAULT 'unverified',
  "logo_url" VARCHAR(500),
  "website_url" VARCHAR(500),
  "office_address" VARCHAR(500),
  "support_phone" VARCHAR(32),
  "description" VARCHAR(2000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_id" VARCHAR(32) NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "managed_by_user_id" UUID,
  "purpose_id" UUID NOT NULL,
  "property_type_id" UUID NOT NULL,
  "city_id" UUID NOT NULL,
  "area_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "description" VARCHAR(5000) NOT NULL,
  "price_amount" DECIMAL(14,2) NOT NULL,
  "price_currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
  "area_value" DECIMAL(12,2) NOT NULL,
  "area_unit" VARCHAR(32) NOT NULL,
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "floor_number" INTEGER,
  "total_floors" INTEGER,
  "year_built" INTEGER,
  "furnished_status" VARCHAR(32),
  "possession_status" VARCHAR(32),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "location_precision" VARCHAR(32) NOT NULL DEFAULT 'approximate',
  "address_line" VARCHAR(500),
  "contact_name" VARCHAR(120),
  "contact_phone" VARCHAR(32),
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "verification_status" VARCHAR(32) NOT NULL DEFAULT 'unverified',
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_hot" BOOLEAN NOT NULL DEFAULT false,
  "quality_score" INTEGER NOT NULL DEFAULT 0,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "inquiry_count" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6),
  "last_refreshed_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listing_id" UUID NOT NULL,
  "media_type" VARCHAR(32) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "url" VARCHAR(1000) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "is_cover" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_amenities" (
  "listing_id" UUID NOT NULL,
  "amenity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_amenities_pkey" PRIMARY KEY ("listing_id", "amenity_id")
);

CREATE TABLE "listing_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listing_id" UUID NOT NULL,
  "from_status" VARCHAR(32),
  "to_status" VARCHAR(32) NOT NULL,
  "reason" VARCHAR(500),
  "changed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_id" VARCHAR(32) NOT NULL,
  "developer_id" UUID NOT NULL,
  "city_id" UUID NOT NULL,
  "area_id" UUID NOT NULL,
  "project_type_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "short_description" VARCHAR(500),
  "description" VARCHAR(5000) NOT NULL,
  "possession_status" VARCHAR(32) NOT NULL,
  "legal_status" VARCHAR(80),
  "expected_handover_date" DATE,
  "launch_date" DATE,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "address_line" VARCHAR(500),
  "brochure_url" VARCHAR(500),
  "payment_plan_summary" VARCHAR(2000),
  "min_price_amount" DECIMAL(14,2),
  "max_price_amount" DECIMAL(14,2),
  "verification_status" VARCHAR(32) NOT NULL DEFAULT 'unverified',
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "property_type_id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "area_value" DECIMAL(12,2),
  "area_unit" VARCHAR(32),
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "min_price_amount" DECIMAL(14,2),
  "max_price_amount" DECIMAL(14,2),
  "down_payment_amount" DECIMAL(14,2),
  "monthly_installment_amount" DECIMAL(14,2),
  "possession_status" VARCHAR(32),
  "inventory_status" VARCHAR(32) NOT NULL DEFAULT 'available',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "media_type" VARCHAR(32) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "url" VARCHAR(1000) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "width" INTEGER,
  "height" INTEGER,
  "is_cover" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_amenities" (
  "project_id" UUID NOT NULL,
  "amenity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_amenities_pkey" PRIMARY KEY ("project_id", "amenity_id")
);

CREATE TABLE "project_updates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(5000) NOT NULL,
  "progress_percent" INTEGER,
  "update_date" DATE NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developers_owner_user_id_key" ON "developers"("owner_user_id");
CREATE UNIQUE INDEX "developers_slug_key" ON "developers"("slug");
CREATE INDEX "developers_verification_status_idx" ON "developers"("verification_status");

CREATE UNIQUE INDEX "listings_public_id_key" ON "listings"("public_id");
CREATE INDEX "listings_owner_user_id_status_idx" ON "listings"("owner_user_id", "status");
CREATE INDEX "listings_status_published_at_idx" ON "listings"("status", "published_at");
CREATE INDEX "listings_city_id_area_id_status_idx" ON "listings"("city_id", "area_id", "status");
CREATE INDEX "listings_purpose_id_property_type_id_idx" ON "listings"("purpose_id", "property_type_id");
CREATE INDEX "listing_media_listing_id_sort_order_idx" ON "listing_media"("listing_id", "sort_order");
CREATE INDEX "listing_amenities_amenity_id_idx" ON "listing_amenities"("amenity_id");
CREATE INDEX "listing_status_history_listing_id_created_at_idx" ON "listing_status_history"("listing_id", "created_at");

CREATE UNIQUE INDEX "projects_public_id_key" ON "projects"("public_id");
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
CREATE INDEX "projects_developer_id_status_idx" ON "projects"("developer_id", "status");
CREATE INDEX "projects_status_published_at_idx" ON "projects"("status", "published_at");
CREATE INDEX "projects_city_id_area_id_status_idx" ON "projects"("city_id", "area_id", "status");
CREATE INDEX "project_units_project_id_sort_order_idx" ON "project_units"("project_id", "sort_order");
CREATE INDEX "project_media_project_id_sort_order_idx" ON "project_media"("project_id", "sort_order");
CREATE INDEX "project_amenities_amenity_id_idx" ON "project_amenities"("amenity_id");
CREATE INDEX "project_updates_project_id_update_date_idx" ON "project_updates"("project_id", "update_date");

ALTER TABLE "developers" ADD CONSTRAINT "developers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_managed_by_user_id_fkey" FOREIGN KEY ("managed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_purpose_id_fkey" FOREIGN KEY ("purpose_id") REFERENCES "listing_purposes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenity_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "property_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_units" ADD CONSTRAINT "project_units_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_units" ADD CONSTRAINT "project_units_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_amenities" ADD CONSTRAINT "project_amenities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_amenities" ADD CONSTRAINT "project_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenity_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
