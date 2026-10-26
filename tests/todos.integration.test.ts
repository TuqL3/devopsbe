import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { validateDatabaseUrl } from '../src/config.js';
import { createDb } from '../src/db.js';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test, and apply migrations first');
}
const testUrl = new URL(validateDatabaseUrl(process.env.TEST_DATABASE_URL));
if (!decodeURIComponent(testUrl.pathname).endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL database name must end in _test; never run integration tests against application data');
}
if (process.env.DATABASE_URL) {
  const appUrl = new URL(validateDatabaseUrl(process.env.DATABASE_URL));
  if (appUrl.hostname === testUrl.hostname && (appUrl.port || '5432') === (testUrl.port || '5432') &&
      decodeURIComponent(appUrl.pathname) === decodeURIComponent(testUrl.pathname)) {
    throw new Error('TEST_DATABASE_URL must refer to a different database from DATABASE_URL');
  }
}

const db = createDb(testUrl.toString());
const app = createApp(db);
const createdIds = new Set<string>();

beforeAll(async () => {
  await db.$connect();
  await db.todo.count();
});
afterAll(async () => {
  try {
    if (createdIds.size) await db.todo.deleteMany({ where: { id: { in: [...createdIds] } } });
  } finally {
    await db.$disconnect();
  }
});

describe('Todo API with real PostgreSQL', () => {
  it('creates, lists, reads, updates, toggles and deletes a persisted Todo', async () => {
    const created = await request(app).post('/api/todos').send({ title: '  Learn DevOps  ' }).expect(201);
    const todo = created.body.data;
    createdIds.add(todo.id);
    expect(todo).toMatchObject({ title: 'Learn DevOps', description: null, completed: false });
    expect(created.headers.location).toBe(`/api/todos/${todo.id}`);
    expect(new Date(todo.createdAt).toISOString()).toBe(todo.createdAt);
    expect(new Date(todo.updatedAt).toISOString()).toBe(todo.updatedAt);

    const independentClient = createDb(testUrl.toString());
    try {
      expect(await independentClient.todo.findUnique({ where: { id: todo.id } })).toMatchObject({ title: 'Learn DevOps' });
    } finally {
      await independentClient.$disconnect();
    }
    const list = await request(app).get('/api/todos').expect(200);
    expect(list.body.data).toContainEqual(todo);
    await request(app).get(`/api/todos/${todo.id}`).expect(200, { data: todo });

    const updated = await request(app).patch(`/api/todos/${todo.id}`)
      .send({ title: ' Deploy ', description: 'Apply migration', completed: true }).expect(200);
    expect(updated.body.data).toMatchObject({ id: todo.id, title: 'Deploy', description: 'Apply migration', completed: true, createdAt: todo.createdAt });
    expect(Date.parse(updated.body.data.updatedAt)).toBeGreaterThanOrEqual(Date.parse(todo.updatedAt));
    const toggled = await request(app).patch(`/api/todos/${todo.id}`).send({ completed: false, description: '' }).expect(200);
    expect(toggled.body.data).toMatchObject({ completed: false, description: null, title: 'Deploy' });
    expect(await db.todo.findUnique({ where: { id: todo.id } })).toMatchObject({ completed: false, description: null });

    const deleted = await request(app).delete(`/api/todos/${todo.id}`).expect(204);
    expect(deleted.text).toBe('');
    expect(await db.todo.findUnique({ where: { id: todo.id } })).toBeNull();
    await request(app).get(`/api/todos/${todo.id}`).expect(404);
  });

  it('returns 404 for nonexistent UUIDs on every item endpoint', async () => {
    const id = randomUUID();
    await request(app).get(`/api/todos/${id}`).expect(404);
    await request(app).patch(`/api/todos/${id}`).send({ completed: true }).expect(404);
    await request(app).delete(`/api/todos/${id}`).expect(404);
  });

  it('rejects invalid writes before touching the database', async () => {
    const before = await db.todo.count();
    await request(app).post('/api/todos').send({ title: ' ', completed: 'true' }).expect(400);
    await request(app).post('/api/todos').send({ title: 'ok', unexpected: true }).expect(400);
    expect(await db.todo.count()).toBe(before);
  });

  it('reports database readiness', async () => {
    await request(app).get('/api/health/live').expect(200, { status: 'alive' });
    await request(app).get('/api/health/ready').expect(200, { status: 'ready' });
  });
});
