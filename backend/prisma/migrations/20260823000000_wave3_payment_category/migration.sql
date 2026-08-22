-- Wave 3 (payment ledger): PaymentCategory for cycle-charge vs proration tagging.
--
-- Additive only. Existing rows keep NULL, which the application treats as
-- SUBSCRIPTION (all legacy payments are subscription-cycle charges by
-- construction - one-time checkout never shipped).

CREATE TYPE "PaymentCategory" AS ENUM ('SUBSCRIPTION', 'PRORATION');

ALTER TABLE "Payment" ADD COLUMN "category" "PaymentCategory";
