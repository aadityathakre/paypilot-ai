import { Router } from 'express';
import { AuditController } from './audit.controller.js';

export const auditRouter = Router();

auditRouter.get('/events', AuditController.listEvents);
