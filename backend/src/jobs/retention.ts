import { prisma } from "../config";

/**
 * How long a click is kept, in days.
 *
 * Deliberately 1,095, which is three years and exactly matches the widest
 * history window any plan sells (Pro `analyticsDays: 1095`). Matching the
 * number matters: if retention were shorter, a Pro customer could request a
 * three-year range and see empty charts at the end of it, because the rows
 * would already be gone.
 *
 * `tests/retention-policy.test.ts` enforces that relationship, so lowering one
 * without the other fails the build instead of quietly shipping a broken
 * promise.
 */
export const RETENTION_DAYS = 1095;

/**
 * Rows deleted per batch.
 *
 * A single unbounded `DELETE` would hold locks for its whole duration, and the
 * failure mode that matters here is a purge stalling live redirects. Batching
 * keeps each transaction short. The loop runs until a batch returns nothing, so
 * total throughput is unaffected by this number.
 */
const BATCH_SIZE = 5_000;

/**
 * Lease TTL.
 *
 * Longer than the reconciliation job's 15 minutes on purpose: reconciliation
 * makes network calls per subscription, while retention is database-bound but
 * may need many batches on a first run against a large backlog. A lease that
 * expires mid-purge would let a second invocation start, and two concurrent
 * purges would fight over the same rows.
 */
const LEASE_TTL_MINUTES = 60;

type RetentionCounters = {
    cutoff: string;
    batchesRun: number;
    rowsDeleted: number;
    maxBatchSizeReached: boolean;
};

function log(entry: Record<string, unknown>) {
    console.log(JSON.stringify({ cat: "RETENTION", ts: new Date().toISOString(), ...entry }));
}

/**
 * Claims the single purge slot, reclaiming a lease abandoned by a crashed run.
 *
 * The database enforces exclusivity via the partial unique index on
 * `RetentionRun`, so concurrent invocations cannot both proceed regardless of
 * how closely they are scheduled together.
 */
async function claimRun(triggeredBy: string): Promise<string | null> {
    const cutoff = new Date(Date.now() - LEASE_TTL_MINUTES * 60_000);

    const reclaimed = await prisma.retentionRun.updateMany({
        where: { status: "running", startedAt: { lt: cutoff } },
        data: { status: "failed", finishedAt: new Date() },
    });

    if (reclaimed.count > 0) {
        log({ action: "stale-leases-reclaimed", count: reclaimed.count });
    }

    try {
        const run = await prisma.retentionRun.create({
            data: { status: "running", triggeredBy },
        });
        return run.id;
    } catch (err) {
        log({ action: "claim-denied", reason: "already-running", error: String(err) });
        return null;
    }
}

async function finishRun(
    runId: string | null,
    status: "completed" | "failed",
    stats?: Record<string, unknown>
) {
    if (!runId) return;
    await prisma.retentionRun.update({
        where: { id: runId },
        data: { status, finishedAt: new Date(), stats: stats as never },
    });
}

/** The instant before which a click is no longer kept. */
export function retentionCutoff(now: Date = new Date()): Date {
    return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Deletes clicks older than the retention window, in batches.
 *
 * Read-only with respect to plans: this job never looks at `analyticsDays` and
 * never varies by tier. A plan governs how far back a dashboard query may
 * reach; retention governs whether the row exists at all. Keeping those
 * separate is what stops a downgraded customer from losing history they paid
 * for — they stop being able to *see* it, but it is still here when they
 * upgrade again.
 *
 * Returns the counters without deleting anything when `dryRun` is set, so the
 * endpoint can answer "how much would this remove?" before anyone commits.
 */
export async function runRetention(
    triggeredBy = "external",
    options: { dryRun?: boolean; now?: Date } = {}
) {
    const runId = await claimRun(triggeredBy);
    if (!runId) {
        return { skipped: true as const, reason: "another-run-is-active" };
    }

    const cutoff = retentionCutoff(options.now);

    const counters: RetentionCounters = {
        cutoff: cutoff.toISOString(),
        batchesRun: 0,
        rowsDeleted: 0,
        maxBatchSizeReached: false,
    };

    log({ action: "run-started", runId, triggeredBy, retentionDays: RETENTION_DAYS, cutoff });

    try {
        for (;;) {
            const aged = await prisma.scan.findMany({
                where: { scannedAt: { lt: cutoff } },
                orderBy: { scannedAt: "asc" },
                take: BATCH_SIZE,
                select: { id: true },
            });

            if (aged.length === 0) {
                break;
            }

            counters.batchesRun++;
            if (aged.length >= BATCH_SIZE) {
                counters.maxBatchSizeReached = true;
            }

            if (options.dryRun) {
                // Count what a real run would remove, then stop after one batch.
                // Counting a full backlog would mean reading every expired row,
                // which is the expensive half of the work.
                counters.rowsDeleted += aged.length;
                log({ action: "dry-run-batch", runId, rows: aged.length });
                break;
            }

            const deleted = await prisma.scan.deleteMany({
                where: { id: { in: aged.map((row) => row.id) } },
            });

            counters.rowsDeleted += deleted.count;
            log({ action: "batch-deleted", runId, deleted: deleted.count });

            if (aged.length < BATCH_SIZE) {
                break;
            }
        }

        await finishRun(runId, "completed", { ...counters });
        log({ action: "run-completed", runId, stats: { ...counters } });

        return { skipped: false as const, runId, stats: counters };
    } catch (err) {
        log({ action: "run-failed", runId, error: String(err) });
        await finishRun(runId, "failed", { error: String(err), ...counters });
        throw err;
    }
}