import { Router } from "express";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { redirectTesterLimiter } from "../../middleware/rateLimit.middleware";
import { testRedirect } from "./redirectTester.controller";

const router = Router();

/**
 * Validated inside the service rather than by the `validate` middleware: the
 * schema needs a resolved default for `preset`, and a preview must never
 * trigger a write, so it is kept off the mutation limiter entirely.
 */
router.post("/preview", authMiddleWare, redirectTesterLimiter, testRedirect);

export default router;
