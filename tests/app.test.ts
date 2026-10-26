import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db.js';
import { Prisma } from '../src/generated/prisma/client.js';

// The client never connects here: every database operation reached by these tests is stubbed.
const db = createDb('postgresql://unused:unused@127.0.0.1:1/unused');
const app = createApp(db);
const id = '212e2a2b-640e-46eb-867f-d523e1cfe398';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('HTTP contract without PostgreSQL', () => {
  it('keeps liveness independent and checks readiness with a database query', async () => {
    const query = vi.spyOn(db, '$queryRaw').mockResolvedValue([{ value: 1 }]);
    await request(app).get('/api/health/live').expect(200, { status: 'alive' });
    expect(query).not.toHaveBeenCalled();
    await request(app).get('/api/health/ready').expect(200, { status: 'ready' });
    expect(query).toHaveBeenCalledOnce();
  });

  it('returns 503 on readiness failure and still serves liveness', async () => {
    vi.spyOn(db, '$queryRaw').mockRejectedValue(new Error('private database details'));
    const response = await request(app).get('/api/health/ready').expect(503);
    expect(response.body).toEqual({ error: { code: 'NOT_READY', message: 'Service is not ready' } });
    await request(app).get('/api/health/live').expect(200);
    expect(JSON.stringify(response.body)).not.toContain('private');
  });

  it('refuses new work and readiness during shutdown without querying the database', async () => {
    const query = vi.spyOn(db, '$queryRaw');
    const shuttingDownApp = createApp(db, () => true);
    await request(shuttingDownApp).get('/api/health/live').expect(200);
    await request(shuttingDownApp).get('/api/health/ready').expect(503);
    await request(shuttingDownApp).get('/api/todos').expect(503);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)('rejects malformed IDs for %s', async (method) => {
    const response = await request(app)[method]('/api/todos/invalid').send({ completed: true }).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns JSON errors for validation, invalid JSON, media type and size limits', async () => {
    const invalid = await request(app).post('/api/todos').send({ title: ' ' }).expect(400);
    expect(invalid.body.error.details.title).toBeTypeOf('string');
    await request(app).post('/api/todos').set('Content-Type', 'application/json').send('{broken').expect(400);
    await request(app).post('/api/todos').type('text').send('hello').expect(415);
    await request(app).patch(`/api/todos/${id}`).type('text').send('hello').expect(415);
    await request(app).post('/api/todos').send({ title: 'x'.repeat(65536) }).expect(413);
  });

  it('maps missing records to 404 for reads, updates and deletes', async () => {
    vi.spyOn(db.todo, 'findUnique').mockResolvedValue(null);
    const missing = new Prisma.PrismaClientKnownRequestError('private query text', { code: 'P2025', clientVersion: 'test' });
    vi.spyOn(db.todo, 'update').mockRejectedValue(missing);
    vi.spyOn(db.todo, 'delete').mockRejectedValue(missing);
    for (const method of ['get', 'patch', 'delete'] as const) {
      const response = await request(app)[method](`/api/todos/${id}`).send({ completed: true }).expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('hides database error messages in responses and logs', async () => {
    vi.spyOn(db.todo, 'findMany').mockRejectedValue(new Error('postgresql://user:secret@db/private'));
    const response = await request(app).get('/api/todos').expect(500);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });

  it('returns JSON for unknown endpoints and does not enable cross-origin access', async () => {
    const response = await request(app).get('/unknown').set('Origin', 'https://other.example').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
