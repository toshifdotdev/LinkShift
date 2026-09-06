import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { runReconciliation } from "../../jobs/reconciliation";
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

export default router;
