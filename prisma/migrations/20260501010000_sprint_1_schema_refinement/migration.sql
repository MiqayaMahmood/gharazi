ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'ACTIVE';

ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);

ALTER TABLE "roles" ADD COLUMN "code" VARCHAR(64);
UPDATE "roles"
SET "code" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "code" IS NULL;
UPDATE "roles" SET "code" = 'buyer' WHERE "name" = 'buyer';
ALTER TABLE "roles" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

ALTER TABLE "property_types" ADD COLUMN "code" VARCHAR(64);
UPDATE "property_types"
SET "code" = CASE
  WHEN "slug" = 'flat' THEN 'apartment'
  ELSE lower(regexp_replace("slug", '[^a-zA-Z0-9]+', '_', 'g'))
END
WHERE "code" IS NULL;
ALTER TABLE "property_types" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "property_types_code_key" ON "property_types"("code");

ALTER TABLE "listing_purposes" ADD COLUMN "code" VARCHAR(64);
UPDATE "listing_purposes"
SET "code" = CASE
  WHEN "slug" = 'buy' THEN 'sale'
  ELSE lower(regexp_replace("slug", '[^a-zA-Z0-9]+', '_', 'g'))
END
WHERE "code" IS NULL;
ALTER TABLE "listing_purposes" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "listing_purposes_code_key" ON "listing_purposes"("code");

ALTER TABLE "amenity_definitions" ADD COLUMN "code" VARCHAR(64);
UPDATE "amenity_definitions"
SET "code" = lower(regexp_replace("slug", '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "code" IS NULL;
ALTER TABLE "amenity_definitions" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "amenity_definitions_code_key" ON "amenity_definitions"("code");

ALTER TABLE "areas" ADD COLUMN "parent_area_id" UUID;
ALTER TABLE "areas" ADD COLUMN "area_level" VARCHAR(32);
UPDATE "areas" SET "area_level" = 'locality' WHERE "area_level" IS NULL;
CREATE INDEX "areas_parent_area_id_idx" ON "areas"("parent_area_id");

ALTER TABLE "areas" DROP CONSTRAINT "areas_city_id_fkey";
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_fkey"
  FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_area_id_fkey"
  FOREIGN KEY ("parent_area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
