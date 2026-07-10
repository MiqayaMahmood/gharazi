CREATE TABLE "professional_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "business_name" VARCHAR(160) NOT NULL,
  "business_type" VARCHAR(64) NOT NULL,
  "contact_person_name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(32) NOT NULL,
  "whatsapp" VARCHAR(32),
  "email" VARCHAR(255),
  "website_url" VARCHAR(500),
  "logo_url" VARCHAR(1000),
  "city_id" UUID,
  "address_line" VARCHAR(500),
  "description" VARCHAR(1000),
  "verification_status" VARCHAR(32) NOT NULL DEFAULT 'unverified',
  "rejection_reason" VARCHAR(1000),
  "package_code" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "professional_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "professional_profiles_user_id_key" ON "professional_profiles"("user_id");
CREATE INDEX "professional_profiles_business_type_verification_status_idx" ON "professional_profiles"("business_type", "verification_status");
CREATE INDEX "professional_profiles_city_id_idx" ON "professional_profiles"("city_id");
