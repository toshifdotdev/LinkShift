import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { redirectParamSchema, unlockSchema } from "./redirect.validation";
import { redirect, unlockController } from "./redirect.controller";
import { unlockLimiter, redirectLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.get("/:shortId", redirectLimiter, validate(redirectParamSchema, "params"), redirect);

router.get("/:shortId/*rest", redirectLimiter, validate(redirectParamSchema, "params"), redirect);

router.post("/:shortId/unlock", unlockLimiter, validate(redirectParamSchema, "params"), validate(unlockSchema, "body"), unlockController);

/* The visitor's appended path survives the password round trip by riding the
   unlock URL itself: POST /abc/unlock/products/123?ref=x */
router.post("/:shortId/unlock/*rest", unlockLimiter, validate(redirectParamSchema, "params"), validate(unlockSchema, "body"), unlockController);

export default router;