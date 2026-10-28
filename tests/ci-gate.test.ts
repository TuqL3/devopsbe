import { expect, it } from 'vitest';

it('blocks an intentionally failing test', () => {
  expect(true).toBe(false);
});
