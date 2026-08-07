import { createServer } from 'node:net';

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen({ host: '0.0.0.0', port }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findAvailablePort(start: number): Promise<number> {
  for (let port = start; port <= 65535; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available development port at or above ${start}`);
}

if (import.meta.main) {
  const requestedPort = Number.parseInt(process.env.PORT || '3001', 10);
  const start = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
  const port = await findAvailablePort(start);
  if (port !== start) console.log(`Port ${start} is busy; using port ${port}`);

  const child = Bun.spawn(['bun', '--hot', 'server.ts'], {
    env: { ...process.env, PORT: String(port) },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  process.exitCode = await child.exited;
}
