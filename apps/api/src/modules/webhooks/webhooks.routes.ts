import { Router } from 'express';
import { WebhooksController } from './webhooks.controller.js';

export const webhooksRouter = Router();

webhooksRouter.post('/razorpay', WebhooksController.handleRazorpayWebhook);
