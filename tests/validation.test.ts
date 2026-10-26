import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/error-handler.js';
import { parseTodoId, parseTodoInput } from '../src/validation.js';

describe('Todo validation', () => {
  it('trims titles and normalizes an empty description', () => {
    expect(parseTodoInput({ title: '  Learn DevOps  ', description: '', completed: false }))
      .toEqual({ title: 'Learn DevOps', description: null, completed: false });
    expect(parseTodoInput({ title: 'a'.repeat(200), description: 'a'.repeat(5000) })).toBeDefined();
  });

  it.each([
    null, [], 'text', 42, {}, { title: '' }, { title: '   ' }, { title: 1 },
    { title: 'a'.repeat(201) }, { title: 'bad\0title' },
    { title: 'ok', description: 1 }, { title: 'ok', description: 'a'.repeat(5001) },
    { title: 'ok', description: '\0' }, { title: 'ok', completed: 'false' },
    { title: 'ok', completed: null }, { title: 'ok', id: 'custom' },
    { title: 'ok', createdAt: '2026-01-01' }, { title: 'ok', updatedAt: '2026-01-01' },
    JSON.parse('{"title":"ok","__proto__":{}}'),
  ])('rejects invalid create input %#', (body) => {
    expect(() => parseTodoInput(body)).toThrow(ApiError);
  });

  it('accepts partial updates without inventing missing fields', () => {
    expect(parseTodoInput({ completed: true }, true)).toEqual({ completed: true });
    expect(parseTodoInput({ description: null }, true)).toEqual({ description: null });
    expect(parseTodoInput({ title: ' next ' }, true)).toEqual({ title: 'next' });
  });

  it.each([{}, { title: undefined }, { completed: undefined }, { unknown: true }, JSON.parse('{"__proto__":{}}')])(
    'rejects invalid patches %#', (body) => {
      expect(() => parseTodoInput(body, true)).toThrow(ApiError);
    },
  );

  it('validates UUID IDs', () => {
    const id = '212e2a2b-640e-46eb-867f-d523e1cfe398';
    expect(parseTodoId(id)).toBe(id);
    expect(parseTodoId(id.toUpperCase())).toBe(id.toUpperCase());
    for (const invalid of ['', '1', `${id}x`, 'not-an-id']) {
      expect(() => parseTodoId(invalid)).toThrow(ApiError);
    }
  });
});
