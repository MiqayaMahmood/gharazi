ALTER TABLE "payment_transactions"
  ALTER COLUMN "entity_id" DROP NOT NULL,
  ADD COLUMN "stripe_checkout_session_id" VARCHAR(160),
  ADD COLUMN "stripe_payment_intent_id" VARCHAR(160),
  ADD COLUMN "stripe_subscription_id" VARCHAR(160),
  ADD COLUMN "package_code" VARCHAR(64),
  ADD COLUMN "paid_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "payment_transactions_stripe_checkout_session_id_key" ON "payment_transactions"("stripe_checkout_session_id");
CREATE UNIQUE INDEX "payment_transactions_stripe_payment_intent_id_key" ON "payment_transactions"("stripe_payment_intent_id");

ALTER TABLE "promotions"
  ADD COLUMN "package_code" VARCHAR(64),
  ADD COLUMN "placement_code" VARCHAR(64),
  ADD COLUMN "is_hot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payment_transaction_id" UUID;

CREATE UNIQUE INDEX "promotions_payment_transaction_id_key" ON "promotions"("payment_transaction_id");

ALTER TABLE "user_subscriptions"
  ADD COLUMN "package_code" VARCHAR(64),
  ADD COLUMN "stripe_customer_id" VARCHAR(160),
  ADD COLUMN "stripe_subscription_id" VARCHAR(160),
  ADD COLUMN "current_period_start" TIMESTAMPTZ(6),
  ADD COLUMN "current_period_end" TIMESTAMPTZ(6),
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metadata_json" JSONB;

CREATE UNIQUE INDEX "user_subscriptions_stripe_subscription_id_key" ON "user_subscriptions"("stripe_subscription_id");
