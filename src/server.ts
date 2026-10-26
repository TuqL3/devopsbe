import { config as loadEnv } from 'dotenv';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDb } from './db.js';

loadEnv({ quiet: true });

try {
  const config = readConfig();
  const db = createDb(config.databaseUrl);
  let shuttingDown = false;
  const server = createApp(db, () => shuttingDown).listen(config.port, config.host, () => {
    console.log(JSON.stringify({ level: 'info', event: 'listening', host: config.host, port: config.port }));
  });
  server.on('error', () => {
    console.error(JSON.stringify({ level: 'error', event: 'listen_failed' }));
    void db.$disconnect().finally(() => { process.exit(1); });
  });

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
    const timeout = setTimeout(() => {
      console.error(JSON.stringify({ level: 'error', event: 'shutdown_timeout' }));
      server.closeAllConnections();
      process.exit(1);
    }, 10000);
    timeout.unref();
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => { if (error) reject(error); else resolve(); });
      });
      await db.$disconnect();
      clearTimeout(timeout);
      console.log(JSON.stringify({ level: 'info', event: 'shutdown_complete' }));
      process.exitCode = 0;
    } catch {
      console.error(JSON.stringify({ level: 'error', event: 'shutdown_failed' }));
      process.exit(1);
    }
  }
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
} catch {
  console.error(JSON.stringify({ level: 'error', event: 'startup_failed', message: 'Check backend environment configuration' }));
  process.exitCode = 1;
}
