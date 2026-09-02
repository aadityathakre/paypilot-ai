import { Router } from 'express';
import { AgentController } from './agent.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createSessionSchema, sendMessageSchema } from './agent.schema.js';

export const agentRouter = Router();

// Agent-Readable Catalog Endpoint for AI Buyers (ACP / UAP / AP2 / x402)
agentRouter.get('/catalog', AgentController.getAgentReadableCatalog);

agentRouter.use(authenticateJwt);

agentRouter.post('/sessions', validateBody(createSessionSchema), AgentController.createSession);
agentRouter.get('/sessions/:id', AgentController.getSession);
agentRouter.post('/sessions/:id/messages', validateBody(sendMessageSchema), AgentController.sendMessage);
