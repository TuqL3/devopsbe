import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

const children = new Set<ReturnType<typeof spawn>>();

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP port');
  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => { if (error) reject(error); else resolve(); });
  });
  return port;
}

async function startServer(databaseUrl = 'postgresql://unused:unused@127.0.0.1:1/unavailable') {
  const port = await availablePort();
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    env: { ...process.env, DATABASE_URL: databaseUrl, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  const output = { stdout: '', stderr: '' };
  const exited = once(child, 'exit');
  child.stdout!.on('data', (data: Buffer) => { output.stdout += data.toString(); });
  child.stderr!.on('data', (data: Buffer) => { output.stderr += data.toString(); });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { reject(new Error('Server did not start within 5 seconds')); }, 5000);
    const onData = () => {
      if (output.stdout.includes('"event":"listening"')) {
        clearTimeout(timeout);
        child.stdout!.off('data', onData);
        resolve();
      }
    };
    child.stdout!.on('data', onData);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); reject(new Error(`Server exited early: ${output.stderr}`)); });
  });
  return { child, output, exited, baseUrl: `http://127.0.0.1:${port}` };
}

afterEach(async () => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
  }
  children.clear();
});

describe('backend process', () => {
  it.each(['SIGTERM', 'SIGINT'] as const)('shuts down cleanly on %s', async (signal) => {
    const { child, output, exited, baseUrl } = await startServer();
    expect((await fetch(`${baseUrl}/api/health/live`)).status).toBe(200);
    child.kill(signal);
    expect(await exited).toEqual([0, null]);
    expect(output.stdout).toContain('"event":"shutdown_complete"');
    expect(output.stderr).toBe('');
  });

  it('serves liveness while PostgreSQL is unavailable and hides database details', async () => {
    const { baseUrl, output } = await startServer();
    expect((await fetch(`${baseUrl}/api/health/ready`)).status).toBe(503);
    const todos = await fetch(`${baseUrl}/api/todos`);
    expect(todos.status).toBe(500);
    expect(await todos.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
    expect((await fetch(`${baseUrl}/api/health/live`)).status).toBe(200);
    expect(output.stderr).not.toContain('postgresql://');
    expect(output.stderr).not.toContain('unused');
  });
});
