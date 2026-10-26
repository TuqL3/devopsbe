import { Router } from 'express';
import type { PrismaClient } from '../generated/prisma/client.js';

export function healthRoutes(db: PrismaClient, isShuttingDown: () => boolean) {
  const router = Router();
  router.get('/live', (_req, res) => { res.json({ status: 'alive' }); });
  router.get('/ready', async (_req, res) => {
    if (!isShuttingDown()) {
      try {
        await db.$queryRaw`SELECT 1`;
        if (!isShuttingDown()) {
          res.json({ status: 'ready' });
          return;
        }
      } catch {
        console.warn(JSON.stringify({ level: 'warn', event: 'readiness_failed' }));
      }
    }
    res.status(503).json({ error: { code: 'NOT_READY', message: 'Service is not ready' } });
  });
  return router;
}
