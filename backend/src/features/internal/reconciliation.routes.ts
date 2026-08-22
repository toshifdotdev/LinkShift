import { Router } from "express";
import { runReconciliation } from "../../jobs/reconciliation";

// Wave 4: reconciliation trigger endpoint.
//
// Auth: shared-secret header (x-recon-secret === RECON_SECRET).
// Dev/testing: manual curl (D-B). Production note (D-C): point an hourly
// external scheduler at this route; no scheduler code ships in V1.
const router = Router();

router.post("/reconciliation/run", async (req, res) => {
    const secret = process.env.RECON_SECRET;

    if (!secret || req.headers["x-recon-secret"] !== secret) {
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

export default router;
