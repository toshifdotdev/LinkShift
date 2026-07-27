import { Router } from 'express';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { dashboardController, analyticsController } from './dashboard.controller';
import { validate } from '../../middleware/validate.middleware';
import { linkIdSchema } from '../link/link.validation';
const router = Router();


router.get("/stats", authMiddleWare,dashboardController);

router.get(":id/analytics", authMiddleWare, validate(linkIdSchema, "params"), analyticsController)
export default router;