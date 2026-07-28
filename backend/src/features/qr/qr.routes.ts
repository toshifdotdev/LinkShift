import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { linkIdSchema } from "../link/link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { qrController } from "./qr.controller";
import { createQrSchema } from "./qr.validation";

const router = Router();

// api/v1/links
router.post('/:id/qr', authMiddleWare, validate(linkIdSchema, "params"), validate(createQrSchema, "body"), qrController);
export default router;