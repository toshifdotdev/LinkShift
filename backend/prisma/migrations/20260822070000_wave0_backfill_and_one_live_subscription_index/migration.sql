-- Wave 0 (billing architecture): enforce "at most ONE live subscription per user".
--
-- Legacy PENDING rows were, by construction, pre-authorization subscriptions
-- (PAYMENT_RETRY did not exist before this migration), so mapping every one of
-- them to AUTHORIZATION_PENDING is lossless.

UPDATE "Subscription" SET "status" = 'AUTHORIZATION_PENDING' WHERE "status" = 'PENDING';

-- Replace the old (userId, status)-scoped index, which permitted ACTIVE+PENDING
-- coexistence and ignored HALTED/PAUSED, with a single-live-row invariant.
DROP INDEX IF EXISTS "Subscription_userId_status_active_pending_key";

CREATE UNIQUE INDEX "Subscription_one_live_per_user_key"
  ON "Subscription" ("userId")
  WHERE "status" IN ('AUTHORIZATION_PENDING', 'PAYMENT_RETRY', 'ACTIVE', 'HALTED', 'PAUSED');
