CREATE TABLE "payment_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "provider" VARCHAR(64) NOT NULL,
  "provider_reference" VARCHAR(160),
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transaction_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'initiated',
  "request_json" JSONB,
  "response_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(80) NOT NULL,
  "entity_type" VARCHAR(32),
  "entity_id" UUID,
  "user_id" UUID,
  "session_id" VARCHAR(120),
  "anonymous_id" VARCHAR(120),
  "idempotency_key" VARCHAR(160),
  "metadata_json" JSONB,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_flags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "risk_type" VARCHAR(64) NOT NULL,
  "severity" VARCHAR(32) NOT NULL DEFAULT 'medium',
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "notes" VARCHAR(1000),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "risk_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_transactions_user_id_status_idx" ON "payment_transactions"("user_id", "status");
CREATE INDEX "payment_transactions_entity_type_entity_id_idx" ON "payment_transactions"("entity_type", "entity_id");
CREATE INDEX "payment_transactions_provider_provider_reference_idx" ON "payment_transactions"("provider", "provider_reference");
CREATE INDEX "payment_attempts_transaction_id_idx" ON "payment_attempts"("transaction_id");
CREATE UNIQUE INDEX "analytics_events_idempotency_key_key" ON "analytics_events"("idempotency_key");
CREATE INDEX "analytics_events_event_type_occurred_at_idx" ON "analytics_events"("event_type", "occurred_at");
CREATE INDEX "analytics_events_entity_type_entity_id_occurred_at_idx" ON "analytics_events"("entity_type", "entity_id", "occurred_at");
CREATE INDEX "risk_flags_entity_type_entity_id_status_idx" ON "risk_flags"("entity_type", "entity_id", "status");
CREATE INDEX "risk_flags_severity_status_idx" ON "risk_flags"("severity", "status");

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
