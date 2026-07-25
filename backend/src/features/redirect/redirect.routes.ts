import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { redirectParamSchema } from "./redirect.validation";
import { redirect } from "./redirect.controller";

const router = Router();

router.get("/:shortId", validate(redirectParamSchema, "params"), redirect);


export default router;