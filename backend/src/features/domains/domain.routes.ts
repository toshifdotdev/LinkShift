import { Router } from 'express';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { domainMutationLimiter } from '../../middleware/rateLimit.middleware';
import { getDomainController, addDomainController, verifyController, updateDomainController, deleteDomainController } from './domain.controller';
import { validate } from '../../middleware/validate.middleware';
import { addDomainSchema, domainIdSchema } from './domain.validation';

const router = Router();

router.get('/', authMiddleWare, getDomainController);
router.post('/', authMiddleWare, domainMutationLimiter, validate(addDomainSchema, "body"), addDomainController);
router.post('/:id/verify', authMiddleWare, domainMutationLimiter, validate(domainIdSchema, "params"), verifyController);    
router.patch('/:id', authMiddleWare, domainMutationLimiter, validate(domainIdSchema, "params"), validate(addDomainSchema, "body"), updateDomainController);
router.delete('/:id', authMiddleWare, domainMutationLimiter, validate(domainIdSchema, "params"), deleteDomainController)

export default router;