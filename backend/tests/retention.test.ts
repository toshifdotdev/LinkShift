import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Retention job tests.
 *
 * The purge issues real `DELETE`s, so this file exercises the loop against a
 * mocked Prisma surface rather than a live database. What is being verified is
 * the decision logic: which rows are eligible, that batching terminates, and
 * that the loop cannot delete a row it should never touch.
 */

const scanFindMany = vi.fn();
const scanDeleteMany = vi.fn();
const retentionCreate = vi.fn();
const retentionUpdate = vi.fn();
const retentionUpdateMany = vi.fn();

vi.mock("../src/config", () => ({
    prisma: {
        scan: {
            findMany: (...a: unknown[]) => scanFindMany(...a),
            deleteMany: (...a: unknown[]) => scanDeleteMany(...a),
        },
        retentionRun: {
            create: (...a: unknown[]) => retentionCreate(...a),
            update: (...a: unknown[]) => retentionUpdate(...a),
            updateMany: (...a: unknown[]) => retentionUpdateMany(...a),
        },
    },
}));

import { RETENTION_DAYS, retentionCutoff, runRetention } from "../src/jobs/retention";

const NOW = new Date("2026-10-02T12:00:00.000Z");
const IDS = (n: number, from = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: `scan-${from + i}` }));

beforeEach(() => {
    vi.clearAllMocks();
    retentionCreate.mockResolvedValue({ id: "run-1" });
    retentionUpdate.mockResolvedValue({});
    retentionUpdateMany.mockResolvedValue({ count: 0 });
    scanDeleteMany.mockResolvedValue({ count: 5 });
    scanFindMany.mockResolvedValue([]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("retention: the window is three years", () => {
    it("matches the widest window any plan sells", async () => {
        // Pro's analyticsDays is 1095. Retention below that would let a Pro
        // customer request a three-year range and see empty charts at the end.
        const { readFileSync } = await import("node:fs");
        const { join } = await import("node:path");
        const seed = readFileSync(
            join(__dirname, "..", "prisma", "seed.ts"),
            "utf8"
        );

        const proBlock = seed.split('name: PlanName.PRO')[1] ?? "";
        const days = Number(/analyticsDays:\s*(\d+)/.exec(proBlock)?.[1]);

        expect(days).toBe(RETENTION_DAYS);
    });

    it("puts the cutoff exactly RETENTION_DAYS in the past", () => {
        expect(retentionCutoff(NOW).toISOString()).toBe("2023-10-03T12:00:00.000Z");
    });
});

describe("retention: what it is allowed to delete", () => {
    it("only ever selects rows older than the cutoff", async () => {
        await runRetention("test", { now: NOW });

        const where = scanFindMany.mock.calls[0][0].where;
        expect(where.scannedAt.lt.toISOString()).toBe("2023-10-03T12:00:00.000Z");
    });

    it("deletes only the ids it selected", async () => {
        scanFindMany.mockResolvedValueOnce(IDS(3));

        await runRetention("test", { now: NOW });

        // Deleting by an explicit id list rather than repeating the age predicate
        // guarantees the two cannot diverge: whatever was selected is what goes.
        const where = scanDeleteMany.mock.calls[0][0].where;
        expect(where.id.in).toEqual(["scan-0", "scan-1", "scan-2"]);
        expect(where.scannedAt).toBeUndefined();
    });

    it("deletes the oldest rows first", async () => {
        await runRetention("test", { now: NOW });

        expect(scanFindMany.mock.calls[0][0].orderBy).toEqual({ scannedAt: "asc" });
    });

    it("never varies by plan", async () => {
        scanFindMany.mockResolvedValueOnce(IDS(2));

        await runRetention("test", { now: NOW });

        // No plan lookup, no tier branch. Retention is a storage rule; the plan
        // decides what can be *read*, not what is kept.
        const serialized = JSON.stringify(scanFindMany.mock.calls[0][0]);
        expect(serialized).not.toMatch(/plan|tier|subscription/i);
    });
});

describe("retention: batching terminates", () => {
    it("deletes nothing when nothing has expired", async () => {
        const result = await runRetention("test", { now: NOW });

        expect(scanDeleteMany).not.toHaveBeenCalled();
        expect(result.stats?.rowsDeleted).toBe(0);
        expect(result.stats?.batchesRun).toBe(0);
    });

    it("keeps going until a short batch signals the end", async () => {
        scanFindMany
            .mockResolvedValueOnce(IDS(5_000, 0))
            .mockResolvedValueOnce(IDS(5_000, 5_000))
            .mockResolvedValueOnce(IDS(7, 10_000))
            .mockResolvedValue([]);
        scanDeleteMany.mockResolvedValue({ count: 5_000 });

        const result = await runRetention("test", { now: NOW });

        expect(scanDeleteMany).toHaveBeenCalledTimes(3);
        expect(result.stats?.batchesRun).toBe(3);
        expect(result.stats?.maxBatchSizeReached).toBe(true);
    });

    it("reports accurately when a batch is exactly full", async () => {
        // A full batch might or might not be the last one, so the loop has to
        // ask again rather than assuming it is finished.
        scanFindMany
            .mockResolvedValueOnce(IDS(5_000))
            .mockResolvedValueOnce([]);
        scanDeleteMany.mockResolvedValue({ count: 5_000 });

        const result = await runRetention("test", { now: NOW });

        expect(scanFindMany).toHaveBeenCalledTimes(2);
        expect(result.stats?.rowsDeleted).toBe(5_000);
    });

    it("stops on a partial batch without a confirming query", async () => {
        scanFindMany.mockResolvedValueOnce(IDS(2));

        await runRetention("test", { now: NOW });

        expect(scanFindMany).toHaveBeenCalledTimes(1);
    });
});

describe("retention: dry run removes nothing", async () => {
    it("counts one batch and deletes nothing", async () => {
        scanFindMany.mockResolvedValueOnce(IDS(5_000));

        const result = await runRetention("test", { dryRun: true, now: NOW });

        expect(scanDeleteMany).not.toHaveBeenCalled();
        expect(result.stats?.rowsDeleted).toBe(5_000);
    });

    it("does not read the whole backlog to count it", async () => {
        scanFindMany.mockResolvedValue(IDS(5_000));

        await runRetention("test", { dryRun: true, now: NOW });

        expect(scanFindMany).toHaveBeenCalledTimes(1);
    });
});

describe("retention: concurrency safety", () => {
    it("declines to start when a run is already active", async () => {
        retentionCreate.mockRejectedValue(new Error("unique violation"));

        const result = await runRetention("test", { now: NOW });

        expect(result.skipped).toBe(true);
        expect(scanDeleteMany).not.toHaveBeenCalled();
    });

    it("reclaims a lease abandoned by a crashed run", async () => {
        await runRetention("test", { now: NOW });

        expect(retentionUpdateMany).toHaveBeenCalled();
        const arg = retentionUpdateMany.mock.calls[0][0];
        expect(arg.where.status).toBe("running");
    });

    it("records the outcome on the run ledger", async () => {
        await runRetention("test", { now: NOW });

        expect(retentionUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "run-1" },
                data: expect.objectContaining({ status: "completed" }),
            })
        );
    });

    it("marks the run failed and rethrows if a batch fails", async () => {
        scanFindMany.mockResolvedValueOnce(IDS(5));
        scanDeleteMany.mockRejectedValue(new Error("deadlock detected"));

        await expect(runRetention("test", { now: NOW })).rejects.toThrow("deadlock");

        expect(retentionUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: "failed" }),
            })
        );
    });
});