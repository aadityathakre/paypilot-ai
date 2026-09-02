import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { verifyPaymentSchema } from './payments.schema.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticateJwt);

paymentsRouter.get('/key', PaymentsController.getKey);
paymentsRouter.post('/create-order', PaymentsController.createOrder);
paymentsRouter.post('/pay-with-wallet', PaymentsController.payWithWallet);
paymentsRouter.post('/verify', validateBody(verifyPaymentSchema), PaymentsController.verifyPayment);
