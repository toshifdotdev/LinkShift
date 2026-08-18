import { Router } from 'express';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { dashboardController, analyticsController, activityController, chartController, csvExportController } from './dashboard.controller';
import { validate } from '../../middleware/validate.middleware';
import { linkIdSchema, queryDaysSchema } from '../link/link.validation';
const router = Router();


router.get("/stats", authMiddleWare,dashboardController);

router.get("/:id/analytics", authMiddleWare, validate(linkIdSchema, "params"), validate(queryDaysSchema, "query"),analyticsController);

router .get("/activity", authMiddleWare, validate(queryDaysSchema, "query"), activityController);

router.get("/:id/charts", authMiddleWare, validate(queryDaysSchema, "query"), chartController);

router.get('/export/:id', authMiddleWare, validate(linkIdSchema, "params"), validate(queryDaysSchema, "query"), csvExportController)

export default router;