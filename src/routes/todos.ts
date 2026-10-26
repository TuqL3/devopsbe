import { Router } from 'express';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from '../error-handler.js';
import { parseTodoId, parseTodoInput } from '../validation.js';

export function todoRoutes(db: PrismaClient) {
  const router = Router();
  router.use((req, _res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json');
    }
    next();
  });

  router.get('/', async (_req, res) => {
    const data = await db.todo.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    res.json({ data });
  });
  router.get('/:id', async (req, res) => {
    const data = await db.todo.findUnique({ where: { id: parseTodoId(req.params.id) } });
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Todo not found');
    res.json({ data });
  });
  router.post('/', async (req, res) => {
    const input = parseTodoInput(req.body);
    const data = await db.todo.create({ data: { ...input, title: input.title! } });
    res.location(`/api/todos/${data.id}`).status(201).json({ data });
  });
  router.patch('/:id', async (req, res) => {
    const id = parseTodoId(req.params.id);
    const data = await db.todo.update({ where: { id }, data: parseTodoInput(req.body, true) });
    res.json({ data });
  });
  router.delete('/:id', async (req, res) => {
    await db.todo.delete({ where: { id: parseTodoId(req.params.id) } });
    res.status(204).end();
  });

  return router;
}
