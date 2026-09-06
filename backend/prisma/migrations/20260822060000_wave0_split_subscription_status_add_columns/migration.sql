-- Wave 0 (billing architecture): split PENDING into AUTHORIZATION_PENDING / PAYMENT_RETRY.
-- Separate migration from the backfill because PostgreSQL cannot USE a newly added
-- enum value in the same transaction that adds it.

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZATION_PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_RETRY';

-- Payment refund tracking (consumed by the refund.processed webhook in Wave 2).
ALTER TABLE "Payment" ADD COLUMN "providerRefundId" TEXT;

-- Dead-letter/ops queries over WebhookEvent.status.
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
