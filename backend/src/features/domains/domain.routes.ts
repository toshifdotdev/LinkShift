import { Router } from 'express';
import { authMiddleWare } from '../../middleware/auth.middleware';
import { getDomainController, addDomainController, verifyController, updateDomainController, deleteDomainController } from './domain.controller';
import { validate } from '../../middleware/validate.middleware';
import { addDomainSchema, domainIdSchema } from './domain.validation';

const router = Router();

router.get('/', authMiddleWare, getDomainController);
router.post('/', authMiddleWare, validate(addDomainSchema, "body"), addDomainController);
router.post('/:id/verify', authMiddleWare, validate(domainIdSchema, "params"), verifyController);    
router.patch('/:id', authMiddleWare, validate(domainIdSchema, "params"), validate(addDomainSchema, "body"), updateDomainController);
router.delete('/:id', authMiddleWare, validate(domainIdSchema, "params"), deleteDomainController)

export default router;