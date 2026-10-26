import type { ErrorRequestHandler } from 'express';
import { Prisma } from './generated/prisma/client.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Todo not found' } });
    return;
  }
  const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'JSON body exceeds 64 KB' } });
    return;
  }
  if (type === 'encoding.unsupported' || type === 'charset.unsupported') {
    res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported JSON encoding' } });
    return;
  }
  // Prisma error messages may contain SQL or credentials; log only the error category and code.
  console.error(JSON.stringify({
    level: 'error', event: 'request_failed',
    category: error instanceof Error ? error.name : 'UnknownError',
    ...(error instanceof Prisma.PrismaClientKnownRequestError && { code: error.code }),
  }));
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
};
