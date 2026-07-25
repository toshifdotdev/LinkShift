import { Router } from "express";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { redirectParamSchema } from "./redirect.validation";
import { redirect } from "./redirect.controller";

const router = Router();

router.get("/:shortId", validate(redirectParamSchema, "params"), redirect);


export default router;