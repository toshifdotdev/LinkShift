-- Wave 4: reconciliation run lease + audit.
-- The partial unique index on the constant expression (1) restricted to
-- status='running' guarantees AT MOST ONE running pass across all machines.
-- Crash recovery: the engine reclaims 'running' rows older than its lease TTL.

CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL DEFAULT 'external',
    "stats" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationRun_single_runner_key"
  ON "ReconciliationRun" ((1))
  WHERE "status" = 'running';

CREATE INDEX "ReconciliationRun_status_idx" ON "ReconciliationRun"("status");
