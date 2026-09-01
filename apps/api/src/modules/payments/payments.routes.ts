import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { verifyPaymentSchema } from './payments.schema.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticateJwt);

paymentsRouter.post('/verify', validateBody(verifyPaymentSchema), PaymentsController.verifyPayment);
