import { Router } from "express";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { contactLimiter, feedbackLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { contactController, feedbackController } from "./support.controller";
import { contactSchema, feedbackSchema } from "./support.validation";

const router = Router();

router.post("/contact", contactLimiter, validate(contactSchema, "body"), contactController);

router.post("/feedback", authMiddleWare, feedbackLimiter, validate(feedbackSchema, "body"), feedbackController);

export default router;
