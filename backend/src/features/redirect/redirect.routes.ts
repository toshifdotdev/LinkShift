import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { redirectParamSchema, unlockSchema } from "./redirect.validation";
import { redirect, unlockController } from "./redirect.controller";

const router = Router();

router.get("/:shortId", validate(redirectParamSchema, "params"), redirect);

router.post("/:shortId/unlock", validate(redirectParamSchema, "params"), validate(unlockSchema, "body"), unlockController);

export default router;