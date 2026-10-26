import { ApiError } from './error-handler.js';

type TodoInput = { title?: string; description?: string | null; completed?: boolean };

export function parseTodoInput(body: unknown, partial = false): TodoInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be a JSON object');
  }
  const input = body as Record<string, unknown>;
  const details: Record<string, string> = Object.create(null);
  const result: TodoInput = {};
  for (const key of Object.keys(input)) {
    if (!['title', 'description', 'completed'].includes(key)) details[key] = 'Unknown field';
  }
  if (!partial || Object.hasOwn(input, 'title')) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200 || input.title.includes('\0')) {
      details.title = 'Title must contain 1 to 200 characters after trimming, without null bytes';
    } else {
      result.title = input.title.trim();
    }
  }
  if (Object.hasOwn(input, 'description')) {
    if (input.description !== null && (typeof input.description !== 'string' || input.description.length > 5000 || input.description.includes('\0'))) {
      details.description = 'Description must be null or a string of up to 5000 characters, without null bytes';
    } else {
      result.description = input.description === '' ? null : input.description as string | null;
    }
  }
  if (Object.hasOwn(input, 'completed')) {
    if (typeof input.completed !== 'boolean') details.completed = 'Completed must be a boolean';
    else result.completed = input.completed;
  }
  if (partial && Object.keys(input).length === 0) details.body = 'Provide at least one field';
  if (Object.keys(details).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Todo data', details);
  return result;
}

export function parseTodoId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Todo ID');
  }
  return id;
}
