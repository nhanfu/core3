import { createServer } from 'node:net';
import { existsSync, readdirSync, statSync } from 'node:fs';

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

async function waitForMediator(port: number, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Event mediator did not become ready on port ${port}${lastError ? `: ${String((lastError as Error)?.message || lastError)}` : ''}`);
}

if (import.meta.main) {
  const argumentsList = process.argv.slice(2);
  const dbArgument = argumentsList.find((argument) => argument.startsWith('--db='));
  const demoData = argumentsList.some((argument) => argument === '--demo-data' || argument === '--demo-data=true');
  const schemaOnly = argumentsList.some((argument) => argument === '--schema-only' || argument === '--schema-only=true');
  const buildCss = argumentsList.some((argument) => argument === '-css' || argument === '--css' || argument === '--css=true');
  const legacyMemoryFlag = argumentsList.some((argument) => argument === '--memory-db' || argument === '--memory-db=true');
  const gatewayRequested = argumentsList.some((argument) => argument === '--gateway' || argument === '--gateway=true');
  const memoryDb = process.env.CORE3_DB_DRIVER === 'duckdb-memory'
    || legacyMemoryFlag
    || argumentsList.some((argument) => argument === '--memory' || argument === '--memory=true');
  const requestedDbValue = dbArgument?.slice('--db='.length) || process.env.CORE3_DB_DRIVER || 'postgres';
  const requestedDb = requestedDbValue === 'pg' ? 'postgres' : requestedDbValue === 'ddb' ? 'duckdb' : requestedDbValue;
  const supported = new Set(['postgres', 'duckdb', 'duckdb-memory', 'mysql', 'oracle', 'sqlserver']);
  if (!supported.has(requestedDb)) throw new Error(`Unsupported database mode: ${requestedDb}. Use --db=postgres|duckdb|mysql|oracle|sqlserver`);
  if (memoryDb && requestedDb !== 'duckdb') throw new Error('--memory can only be used with --db=duckdb');
  const defaultDriver = memoryDb ? 'duckdb-memory' : requestedDb;
  if (buildCss) {
    const cssBuild = Bun.spawn(['bun', 'run', 'css:build'], { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
    const exitCode = await cssBuild.exited;
    if (exitCode !== 0) throw new Error(`CSS build failed with exit code ${exitCode}`);
  }
  const serviceIds = readdirSync('services', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`services/${entry.name}/manifest.yaml`))
    .map((entry) => entry.name);
  const databaseEnv: Record<string, string> = {
    CORE3_DB_DRIVER: defaultDriver,
  };
  if (demoData || schemaOnly) databaseEnv.CORE3_CLEAN_DB = 'true';
  if (schemaOnly) databaseEnv.CORE3_SCHEMA_ONLY = 'true';
  for (const serviceId of serviceIds) {
    const prefix = serviceId.toUpperCase().replaceAll('-', '_');
    databaseEnv[`CORE3_${prefix}_DB_DRIVER`] = process.env[`CORE3_${prefix}_DB_DRIVER`] || defaultDriver;
  }
  if (memoryDb) {
    databaseEnv.CORE3_AUTH_DB_PATH = ':memory:';
    databaseEnv.CORE3_ORDER_DB_PATH = ':memory:';
    databaseEnv.CORE3_CHAT_DB_PATH = ':memory:';
    databaseEnv.CORE3_EVENT_DB_PATH = ':memory:';
  } else if (requestedDb === 'ddb') {
    databaseEnv.CORE3_AUTH_DB_PATH = process.env.CORE3_AUTH_DB_PATH || '../coredb/auth.duckdb';
    databaseEnv.CORE3_ORDER_DB_PATH = process.env.CORE3_ORDER_DB_PATH || '../coredb/order.duckdb';
    databaseEnv.CORE3_CHAT_DB_PATH = process.env.CORE3_CHAT_DB_PATH || '../coredb/chat.duckdb';
  } else {
    const defaults: Record<string, string> = {
      postgres: 'postgres://postgres:postgres@127.0.0.1:55433/core3',
      mysql: 'mysql://root:root@127.0.0.1:3306/core3',
      oracle: 'oracle://system:oracle@127.0.0.1:1521/XE',
      sqlserver: 'sqlserver://sa:YourStrong!Passw0rd@127.0.0.1:1433/core3',
    };
    const url = defaults[defaultDriver];
    databaseEnv.CORE3_AUTH_DATABASE_URL = process.env.CORE3_AUTH_DATABASE_URL || url;
    databaseEnv.CORE3_ORDER_DATABASE_URL = process.env.CORE3_ORDER_DATABASE_URL || url;
    databaseEnv.CORE3_CHAT_DATABASE_URL = process.env.CORE3_CHAT_DATABASE_URL || url;
  }
  console.log(`Starting Core3 with service databases: ${serviceIds.map((serviceId) => `${serviceId}=${databaseEnv[`CORE3_${serviceId.toUpperCase()}_DB_DRIVER`]}`).join(', ')}`);
  const requestedPort = Number.parseInt(process.env.PORT || '3001', 10);
  const start = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
  const port = await findAvailablePort(start);
  const inProcessTopology = gatewayRequested || process.env.CORE3_TOPOLOGY === 'dev_inproc';
  const serviceHostPort = inProcessTopology ? await findAvailablePort(port + 1) : port;
  const requestedFrontendPort = Number.parseInt(process.env.FRONTEND_PORT || (inProcessTopology ? String(serviceHostPort + 1) : '3002'), 10);
  const frontendStart = Number.isInteger(requestedFrontendPort) && requestedFrontendPort > 0 ? requestedFrontendPort : 3002;
  const frontendPort = await findAvailablePort(frontendStart);
  const eventMode = process.env.CORE3_EVENT_MODE || (inProcessTopology ? 'embedded' : 'mediator');
  const serviceRegistryToken = process.env.CORE3_SERVICE_REGISTRY_TOKEN || process.env.CORE3_AUTH_WORKLOAD_TOKEN || (inProcessTopology ? `dev-registry-${crypto.randomUUID()}` : '');
  const useMediator = !inProcessTopology && eventMode === 'mediator';
  const mediatorPort = useMediator ? await findAvailablePort(Number(process.env.EVENT_MEDIATOR_PORT || '3010')) : 0;
  const mediatorUrl = mediatorPort ? `ws://127.0.0.1:${mediatorPort}/events` : '';
  if (port !== start) console.log(`Port ${start} is busy; using port ${port}`);
  if (frontendPort !== frontendStart) console.log(`Frontend port ${frontendStart} is busy; using port ${frontendPort}`);
  if (mediatorPort && mediatorPort !== 3010) console.log(`Event mediator port 3010 is busy; using port ${mediatorPort}`);
  console.log(`Backend: http://127.0.0.1:${port}${inProcessTopology ? ` via service host ${serviceHostPort}` : ''}`);
  console.log(`Frontend: http://127.0.0.1:${frontendPort}`);

  let stopped = false;
  let restartRequested = false;
  let child: ReturnType<typeof Bun.spawn> | null = null;
  let frontend: ReturnType<typeof Bun.spawn> | null = null;
  let gateway: ReturnType<typeof Bun.spawn> | null = null;
  const mediator = useMediator ? Bun.spawn(['bun', '../med/src/event-mediator-server.ts'], {
    env: {
      ...process.env,
      ...databaseEnv,
      EVENT_MEDIATOR_PORT: String(mediatorPort),
      CORE3_EVENT_MODE: eventMode,
      CORE3_EVENT_MEDIATOR_URL: mediatorUrl,
      ...(demoData || schemaOnly ? { CORE3_CLEAN_EVENT_STORE: 'true' } : {}),
      ...(memoryDb ? { CORE3_EVENT_DB_PATH: ':memory:' } : {}),
    },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }) : null;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;

  const sourceChanged = (filename: string | Buffer | null) => {
    const path = String(filename || '').replaceAll('\\', '/');
    return /\.(ts|tsx|yaml|yml|scss)$/i.test(path)
      && !path.includes('/node_modules/')
      && !path.includes('/.data/');
  };

  const watchTargets = [
    'services',
    'db',
    'public',
    'scripts',
    'server.ts',
    'config.yaml',
    '../packages/client/src',
    '../packages/client/package.json',
    '../packages/server/src',
    '../packages/server/package.json',
  ].filter((target) => existsSync(target));
  const ignoredDirectoryNames = new Set(['.git', '.data', 'node_modules', 'dist', 'build', 'coverage']);
  const sourceFiles = (target: string): string[] => {
    if (!statSync(target).isDirectory()) return sourceChanged(target) ? [target] : [];
    const files: string[] = [];
    for (const entry of readdirSync(target, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ignoredDirectoryNames.has(entry.name)) continue;
        files.push(...sourceFiles(`${target}/${entry.name}`));
      } else if (sourceChanged(entry.name)) {
        files.push(`${target}/${entry.name}`);
      }
    }
    return files;
  };
  const snapshot = () => new Map(
    watchTargets.flatMap((target) => sourceFiles(target)).map((file) => {
      const info = statSync(file);
      return [file, `${info.mtimeMs}:${info.size}`] as const;
    }),
  );
  let previousSnapshot = snapshot();
  const watchTimer = setInterval(() => {
    if (stopped) return;
    const nextSnapshot = snapshot();
    const changed = nextSnapshot.size !== previousSnapshot.size
      || [...nextSnapshot].some(([file, value]) => previousSnapshot.get(file) !== value);
    previousSnapshot = nextSnapshot;
    if (!changed) return;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartRequested = true;
      child?.kill();
    }, 100);
  }, 500);

  const stop = () => {
    stopped = true;
    clearInterval(watchTimer);
    clearTimeout(restartTimer);
    child?.kill();
    frontend?.kill();
    gateway?.kill();
    mediator?.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    if (inProcessTopology) {
      gateway = Bun.spawn(['bun', 'scripts/gateway.ts'], {
        env: { ...process.env, PORT: String(port), CORE3_SERVICE_HOST_URL: `http://127.0.0.1:${serviceHostPort}`, CORE3_SERVICE_REGISTRY_TOKEN: serviceRegistryToken, CORE3_GATEWAY_RATE_LIMITS: '[]' },
        stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
      });
    }
    if (mediator) await waitForMediator(mediatorPort);
    frontend = Bun.spawn(['bun', 'run', 'frontend:dev'], {
      env: {
        ...process.env,
        CORE3_BACKEND_PORT: String(port),
        CORE3_FRONTEND_PORT: String(frontendPort),
      },
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });
    while (!stopped) {
      child = Bun.spawn(['bun', 'server.ts'], {
        env: {
          ...process.env,
          ...databaseEnv,
          PORT: String(inProcessTopology ? serviceHostPort : port),
          CORE3_TOPOLOGY: inProcessTopology ? 'dev_inproc' : (process.env.CORE3_TOPOLOGY || 'distributed'),
          CORE3_SERVICE_HOST_URL: inProcessTopology ? `http://127.0.0.1:${serviceHostPort}` : (process.env.CORE3_SERVICE_HOST_URL || ''),
           CORE3_SERVICE_BASE_URL: inProcessTopology ? `http://127.0.0.1:${serviceHostPort}` : (process.env.CORE3_SERVICE_BASE_URL || ''),
           CORE3_SERVICE_REGISTRY_TOKEN: serviceRegistryToken,
          CORE3_SERVICE_EXECUTION: inProcessTopology ? 'inproc' : (process.env.CORE3_SERVICE_EXECUTION || 'http'),
          CORE3_EVENT_MODE: eventMode,
          CORE3_EVENT_MEDIATOR_URL: mediatorUrl,
          ...(demoData || schemaOnly ? { CORE3_CLEAN_EVENT_STORE: 'true' } : {}),
          ...(memoryDb ? { CORE3_EVENT_DB_PATH: ':memory:' } : {}),
        },
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const exitCode = await child.exited;
      child = null;
      if (!restartRequested || stopped) {
        process.exitCode = exitCode;
        break;
      }
      restartRequested = false;
    }
  } finally {
    stop();
  }
}
