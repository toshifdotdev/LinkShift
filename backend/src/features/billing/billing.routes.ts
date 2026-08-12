import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { checkoutSchema } from './billing.validation';
import { checkoutController } from './billing.controller';
const router = Router();

router.post('/checkout', authMiddleWare, validate(checkoutSchema, "body"), checkoutController);

export default router;