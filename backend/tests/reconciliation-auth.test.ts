import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

// ---------------------------------------------------------------------------
// Reconciliation trigger endpoint auth: shared-secret header compared
// timing-safely. Correct secret → the run executes; wrong / missing /
// different-length secret (and unset configured secret) → 401, and the run
// is never started. Hermetic: the reconciliation job is mocked.
// ---------------------------------------------------------------------------

const runReconciliation = vi.hoisted(() => vi.fn());
vi.mock(import("../src/jobs/reconciliation"), () => ({ runReconciliation }));

// Placeholder credentials so module imports succeed without real secrets
// (same convention as CI).
process.env.RAZORPAY_KEY_ID ??= "rzp_test_placeholder";
process.env.RAZORPAY_KEY_SECRET ??= "placeholder_secret";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "whsec_placeholder";
process.env.RESEND_API_KEY ??= "re_placeholder";
process.env.JWT_SECRET ??= "test-jwt-secret";

const SECRET = "recon-secret-0123456789abcdef";
const HEADER = "x-recon-secret";

let app: Express;

beforeAll(async () => {
    process.env.RECON_SECRET = SECRET;
    ({ app } = await import("../src/app"));
}, 180_000); // cold import of the full app graph is slow on modest machines

afterAll(() => {
    delete process.env.RECON_SECRET;
});

describe("POST /api/v1/internal/reconciliation/run", () => {
    it("accepts the correct secret and runs the reconciliation", async () => {
        runReconciliation.mockResolvedValue({ runId: "run-1", stats: { healed: 0 } });

        const res = await request(app)
            .post("/api/v1/internal/reconciliation/run")
            .set(HEADER, SECRET);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, runId: "run-1" });
        expect(runReconciliation).toHaveBeenCalledWith("manual-curl");
    });

    it("rejects an incorrect secret of the same length without running", async () => {
        runReconciliation.mockClear();
        const wrong = SECRET.replace(/^recon/, "wr0ng");

        const res = await request(app).post("/api/v1/internal/reconciliation/run").set(HEADER, wrong);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ success: false, message: "Unauthorized" });
        expect(runReconciliation).not.toHaveBeenCalled();
    });

    it("rejects a missing secret header without running", async () => {
        runReconciliation.mockClear();

        const res = await request(app).post("/api/v1/internal/reconciliation/run");

        expect(res.status).toBe(401);
        expect(runReconciliation).not.toHaveBeenCalled();
    });

    it("rejects a different-length secret without throwing", async () => {
        runReconciliation.mockClear();

        const res = await request(app)
            .post("/api/v1/internal/reconciliation/run")
            .set(HEADER, "short");

        expect(res.status).toBe(401);
        expect(runReconciliation).not.toHaveBeenCalled();
    });

    it("fails closed when no secret is configured", async () => {
        runReconciliation.mockClear();
        // Re-import with RECON_SECRET unset so env.ts caches an empty secret.
        vi.resetModules();
        delete process.env.RECON_SECRET;
        const fresh = await import("../src/app");

        const res = await request(fresh.app)
            .post("/api/v1/internal/reconciliation/run")
            .set(HEADER, SECRET);

        expect(res.status).toBe(401);
        expect(runReconciliation).not.toHaveBeenCalled();
    });
});
