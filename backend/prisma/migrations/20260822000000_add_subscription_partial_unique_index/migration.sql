-- Add partial unique index to prevent duplicate ACTIVE/PENDING subscriptions per user
-- Allows multiple CANCELLED, EXPIRED, COMPLETED, HALTED, PAUSED subscriptions (preserves history)

CREATE UNIQUE INDEX "Subscription_userId_status_active_pending_key" 
ON "Subscription" ("userId", "status") 
WHERE "status" IN ('ACTIVE', 'PENDING');