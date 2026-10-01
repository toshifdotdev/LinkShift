import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { runReconciliation } from "../../jobs/reconciliation";
import { runRetention, RETENTION_DAYS } from "../../jobs/retention";
import { config } from "../../config";

const router = Router();

const secretMatches = (provided: unknown): boolean => {
    const expected = config.reconSecret;
    
    if (!expected || typeof provided !== "string" || provided.length === 0) {
        return false;
    }
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    
    
    return a.length === b.length && timingSafeEqual(a, b);
};

router.post("/reconciliation/run", async (req, res) => {
    if (!secretMatches(req.headers["x-recon-secret"])) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    try {
        const result = await runReconciliation("manual-curl");

        if (result.skipped) {
            return res.status(409).json({
                success: false,
                skipped: true,
                reason: result.reason,
            });
        }

        return res.json({
            success: true,
            runId: result.runId,
            stats: result.stats,
        });
    } catch (err) {
        console.error("[RECON] run failed:", err);
        return res.status(500).json({
            success: false,
            message: "Reconciliation failed",
        });
    }
});


/**
 * Click retention purge.
 *
 * Separate route from reconciliation on purpose. Billing repair and a
 * multi-batch delete must be able to run at the same time, and a failure in
 * either must not take the other down with it: they use separate run ledgers
 * precisely so neither can block the other.
 *
 * Schedule this weekly. It is a no-op once the backlog is cleared, so an extra
 * invocation costs nothing.
 *
 *   curl -X POST https://<host>/api/v1/internal/retention/run \
 *        -H "x-recon-secret: $RECON_SECRET"
 *
 * Pass {"dryRun": true} to report what would be removed without deleting.
 */
router.post("/retention/run", async (req, res) => {
    if (!secretMatches(req.headers["x-recon-secret"])) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    try {
        const result = await runRetention("external-scheduler", {
            dryRun: req.body?.dryRun === true,
        });

        if (result.skipped) {
            return res.status(409).json({
                success: false,
                skipped: true,
                reason: result.reason,
            });
        }

        return res.json({
            success: true,
            runId: result.runId,
            retentionDays: RETENTION_DAYS,
            stats: result.stats,
        });
    } catch (err) {
        console.error("[RETENTION] run failed:", err);
        return res.status(500).json({
            success: false,
            message: "Retention purge failed",
        });
    }
});

export default router;
