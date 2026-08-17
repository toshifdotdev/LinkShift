import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { cancelSubscriptionSchema, changePlanSchema, checkoutSchema, paymentVerificationSchema, subscriptionSchema, subscriptionVerificationSchema} from './billing.validation';
import { cancelSubscriptionController, changePlanController, checkoutController, getPlansController, getSubscriptionController, subscriptionController, verifyPaymentController, verifySubscriptionController } from './billing.controller';
const router = Router();

router.post('/checkout', authMiddleWare, validate(checkoutSchema, "body"), checkoutController);
router.get('/plans', getPlansController);
router.post('/verify', authMiddleWare, validate(paymentVerificationSchema, "body"), verifyPaymentController);
router.post('/subscribe', authMiddleWare, validate(subscriptionSchema, "body"), subscriptionController);
router.post('/subscribe/verify', authMiddleWare, validate(subscriptionVerificationSchema, "body"), verifySubscriptionController);

router.post('/cancel', authMiddleWare, validate(cancelSubscriptionSchema, "body"), cancelSubscriptionController);

router.post('/change-plan', authMiddleWare, validate(changePlanSchema, "body"), changePlanController)

router.get('/subscription', authMiddleWare, getSubscriptionController);
export default router; 