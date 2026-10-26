import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export function createDb(databaseUrl: string) {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 2000,
    query_timeout: 3000,
    statement_timeout: 3000,
    application_name: 'acquisitions',
  }, { schema: new URL(databaseUrl).searchParams.get('schema') ?? 'public' });
  return new PrismaClient({ adapter, log: [] });
}
