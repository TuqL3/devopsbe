import { describe, expect, it } from 'vitest';
import { readConfig, validateDatabaseUrl } from '../src/config.js';

const databaseUrl = 'postgresql://test:example@localhost:5432/todo';

describe('environment configuration', () => {
  it('provides defaults and accepts explicit settings', () => {
    expect(readConfig({ DATABASE_URL: databaseUrl })).toEqual({
      databaseUrl, host: '0.0.0.0', port: 3000, nodeEnv: 'development',
    });
    expect(readConfig({ DATABASE_URL: databaseUrl, HOST: '127.0.0.1', PORT: '4000', NODE_ENV: 'production' }))
      .toEqual({ databaseUrl, host: '127.0.0.1', port: 4000, nodeEnv: 'production' });
  });

  it.each(['', '0', '-1', '65536', '3.5', '3000oops', ' '])('rejects invalid port %j', (port) => {
    expect(() => readConfig({ DATABASE_URL: databaseUrl, PORT: port })).toThrow('PORT');
  });

  it.each([undefined, '', 'secret-invalid-url', 'http://localhost/todo', 'postgresql://localhost/']) (
    'rejects invalid database URL without exposing it %#', (url) => {
      expect(() => validateDatabaseUrl(url)).toThrow('DATABASE_URL must be a PostgreSQL URL');
    },
  );

  it('rejects unsupported mode or an empty host', () => {
    expect(() => readConfig({ DATABASE_URL: databaseUrl, NODE_ENV: 'staging' })).toThrow('NODE_ENV');
    expect(() => readConfig({ DATABASE_URL: databaseUrl, HOST: ' ' })).toThrow('HOST');
  });
});
