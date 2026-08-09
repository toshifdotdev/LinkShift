import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { linkIdSchema, qrIdSchema } from "../link/link.validation";
import { authMiddleWare } from "../../middleware/auth.middleware";
import { qrController, qrDownloader, uploadQrLogoController, deleteQrController } from "./qr.controller";
import { createQrSchema } from "./qr.validation";
import { qrLimiter } from "../../middleware/rateLimit.middleware";
import { imageUpload } from "../../middleware/upload.middleware";

const router = Router();

// api/v1/qr  --> route start from this  
router.post('/:id', authMiddleWare, qrLimiter, validate(linkIdSchema, "params"), validate(createQrSchema, "body"), qrController);
router.get('/:id/download', authMiddleWare, validate(linkIdSchema, "params"), qrDownloader);

router.post('/logo', authMiddleWare, imageUpload.single("image"), uploadQrLogoController);

router.delete('/:id', authMiddleWare, validate(qrIdSchema, "params"),deleteQrController);
export default router;