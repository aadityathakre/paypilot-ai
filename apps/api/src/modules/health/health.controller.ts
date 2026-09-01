import { Request, Response } from 'express';
import { env } from '../../config/env.js';

export const getHealth = (req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'paypilot-api',
      version: '1.0.0',
      track: 'Track 1 — AI Growth & Agentic Commerce',
      environment: env.NODE_ENV,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        memoryHeapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      },
    },
    requestId: req.requestId,
  });
};
