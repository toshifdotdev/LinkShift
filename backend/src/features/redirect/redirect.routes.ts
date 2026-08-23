import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { redirectParamSchema, unlockSchema } from "./redirect.validation";
import { redirect, unlockController } from "./redirect.controller";
import { unlockLimiter, redirectLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.get("/:shortId", redirectLimiter, validate(redirectParamSchema, "params"), redirect);

router.post("/:shortId/unlock", unlockLimiter, validate(redirectParamSchema, "params"), validate(unlockSchema, "body"), unlockController);

export default router;