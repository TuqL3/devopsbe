import express from 'express';
import type { PrismaClient } from './generated/prisma/client.js';
import { ApiError, errorHandler } from './error-handler.js';
import { healthRoutes } from './routes/health.js';
import { todoRoutes } from './routes/todos.js';

export function createApp(db: PrismaClient, isShuttingDown: () => boolean = () => false) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.setHeader('Cache-Control', 'no-store');
    res.on('finish', () => {
      console.log(JSON.stringify({
        level: 'info', event: 'request', method: req.method,
        path: req.path, status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }));
    });
    next();
  });
  app.use('/api/health', healthRoutes(db, isShuttingDown));
  app.use((_req, _res, next) => {
    if (isShuttingDown()) throw new ApiError(503, 'NOT_READY', 'Service is shutting down');
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/todos', todoRoutes(db));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found')));
  app.use(errorHandler);
  return app;
}
