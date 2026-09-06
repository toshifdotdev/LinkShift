import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { billingMutationLimiter } from '../../middleware/rateLimit.middleware';
import { cancelSubscriptionSchema, changePlanSchema, subscriptionSchema, subscriptionVerificationSchema} from './billing.validation';
import { cancelSubscriptionController, changePlanController, getPlansController, getSubscriptionController, getUsageController, subscriptionController, verifySubscriptionController } from './billing.controller';
const router = Router();

router.get('/plans', getPlansController);

router.post('/subscribe', authMiddleWare, billingMutationLimiter, validate(subscriptionSchema, "body"), subscriptionController);
router.post('/subscribe/verify', authMiddleWare, billingMutationLimiter, validate(subscriptionVerificationSchema, "body"), verifySubscriptionController);

router.post('/cancel', authMiddleWare, billingMutationLimiter, validate(cancelSubscriptionSchema, "body"), cancelSubscriptionController);

router.post('/change-plan', authMiddleWare, billingMutationLimiter, validate(changePlanSchema, "body"), changePlanController)

router.get('/subscription', authMiddleWare, getSubscriptionController);
router.get('/usage', authMiddleWare, getUsageController);

export default router; 