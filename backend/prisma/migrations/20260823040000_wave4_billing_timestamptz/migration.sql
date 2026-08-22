-- Wave 4 (S3b): convert billing instant columns from naive TIMESTAMP(3) to
-- TIMESTAMPTZ(3). Prisma historically wrote UTC wall-clock strings into the
-- naive columns while node-postgres parsed reads as local time, producing a
-- persistent +05:30 skew between provider epochs and stored instants. That
-- skew broke reconciliation convergence (silent repairs every pass) and skewed
-- stale-AUTHORIZATION_PENDING age checks.
--
-- Existing values were written as UTC wall-clock, so AT TIME ZONE 'UTC' yields
-- the correct absolute instants. Billing scope only; other domains untouched.

ALTER TABLE "Subscription"
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "currentPeriodStart" TYPE TIMESTAMPTZ(3) USING "currentPeriodStart" AT TIME ZONE 'UTC',
  ALTER COLUMN "currentPeriodEnd" TYPE TIMESTAMPTZ(3) USING "currentPeriodEnd" AT TIME ZONE 'UTC',
  ALTER COLUMN "cancelledAt" TYPE TIMESTAMPTZ(3) USING "cancelledAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "Payment"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "Refund"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "ReconciliationRun"
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "finishedAt" TYPE TIMESTAMPTZ(3) USING "finishedAt" AT TIME ZONE 'UTC';
