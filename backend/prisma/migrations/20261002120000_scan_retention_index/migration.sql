-- Scan retention support.
--
-- Every existing index on "Scan" leads with linkId or isBot. A retention purge
-- filters on scannedAt alone, so without an index leading with that column
-- Postgres falls back to a sequential scan of the whole table. On a large
-- Scan table that holds locks long enough to stall redirects, which is the
-- exact outcome a retention job must never cause.
CREATE INDEX "Scan_scannedAt_idx" ON "Scan"("scannedAt");

-- Run ledger for the retention purge.
--
-- Deliberately a separate table from ReconciliationRun: that table carries a
-- partial unique index on (1) WHERE status = 'running', which permits exactly
-- one running job across the entire table. Sharing it would mean a slow
-- multi-batch purge and billing reconciliation could never overlap, and a
-- failure in either would block the other. Retention is a different concern
-- with a different schedule and must fail independently.
CREATE TABLE "RetentionRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL DEFAULT 'external',
    "stats" JSONB,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RetentionRun_pkey" PRIMARY KEY ("id")
);

-- One purge at a time, enforced by the database rather than by application
-- timing, so overlapping scheduler invocations cannot both start.
CREATE UNIQUE INDEX "RetentionRun_single_runner_key"
    ON "RetentionRun" ((1))
    WHERE "status" = 'running';

CREATE INDEX "RetentionRun_status_idx" ON "RetentionRun"("status");