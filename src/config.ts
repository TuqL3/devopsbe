export function validateDatabaseUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
      throw new Error();
    }
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a host and database name');
  }
  return value!;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = env.PORT ?? '3000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, production, or test');
  }
  const host = env.HOST ?? '0.0.0.0';
  if (!host.trim()) throw new Error('HOST must not be empty');

  return { databaseUrl: validateDatabaseUrl(env.DATABASE_URL), port: Number(port), host, nodeEnv };
}
