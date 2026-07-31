import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { linkIdSchema } from "../link/link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { qrController, qrDownloader } from "./qr.controller";
import { createQrSchema } from "./qr.validation";
import { qrLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

// api/v1/qr  --> route start from this  
router.post('/:id', authMiddleWare, qrLimiter, validate(linkIdSchema, "params"), validate(createQrSchema, "body"), qrController);
router.get('/:id/download', authMiddleWare, validate(linkIdSchema, "params"), qrDownloader)
 
export default router;