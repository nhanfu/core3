import { createServer } from 'node:net';
import { existsSync, statSync, watch } from 'node:fs';

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
  const argumentsList = process.argv.slice(2);
  const dbArgument = argumentsList.find((argument) => argument.startsWith('--db='));
  const demoData = argumentsList.some((argument) => argument === '--demo-data' || argument === '--demo-data=true');
  const schemaOnly = argumentsList.some((argument) => argument === '--schema-only' || argument === '--schema-only=true');
  const legacyMemoryFlag = argumentsList.some((argument) => argument === '--memory-db' || argument === '--memory-db=true');
  const memoryDb = process.env.CORE3_DB_DRIVER === 'duckdb-memory'
    || legacyMemoryFlag
    || argumentsList.some((argument) => argument === '--memory' || argument === '--memory=true');
  const requestedDbValue = dbArgument?.slice('--db='.length) || process.env.CORE3_DB_DRIVER || 'postgres';
  const requestedDb = requestedDbValue === 'pg' ? 'postgres' : requestedDbValue === 'ddb' ? 'duckdb' : requestedDbValue;
  const supported = new Set(['postgres', 'duckdb', 'duckdb-memory', 'mysql', 'oracle', 'sqlserver']);
  if (!supported.has(requestedDb)) throw new Error(`Unsupported database mode: ${requestedDb}. Use --db=postgres|duckdb|mysql|oracle|sqlserver`);
  if (memoryDb && requestedDb !== 'duckdb') throw new Error('--memory can only be used with --db=duckdb');
  const defaultDriver = memoryDb ? 'duckdb-memory' : requestedDb;
  const serviceIds = ['auth', 'order', 'chat', 'crm', 'point-of-sale', 'sale-subscription', 'sale-renting'] as const;
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
  const mediatorPort = await findAvailablePort(Number(process.env.EVENT_MEDIATOR_PORT || '3010'));
  const mediatorUrl = `ws://127.0.0.1:${mediatorPort}/events`;
  if (port !== start) console.log(`Port ${start} is busy; using port ${port}`);
  if (mediatorPort !== 3010) console.log(`Event mediator port 3010 is busy; using port ${mediatorPort}`);

  let stopped = false;
  let restartRequested = false;
  let child: ReturnType<typeof Bun.spawn> | null = null;
  const mediator = Bun.spawn(['bun', '../med/src/event-mediator-server.ts'], {
    env: {
      ...process.env,
      ...databaseEnv,
      EVENT_MEDIATOR_PORT: String(mediatorPort),
      CORE3_EVENT_MODE: 'mediator',
      CORE3_EVENT_MEDIATOR_URL: mediatorUrl,
      ...(demoData || schemaOnly ? { CORE3_CLEAN_EVENT_STORE: 'true' } : {}),
      ...(memoryDb ? { CORE3_EVENT_DB_PATH: ':memory:' } : {}),
    },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
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
    '../packages/client',
    '../packages/server',
  ].filter((target) => existsSync(target));
  const watchers: Array<{ close(): void }> = [];
  try {
    for (const target of watchTargets) {
      watchers.push(watch(target, { recursive: statSync(target).isDirectory() }, (_event, filename) => {
        if (!sourceChanged(filename) || stopped) return;
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          restartRequested = true;
          child?.kill();
        }, 100);
      }));
    }
  } catch (error: any) {
    for (const watcher of watchers) watcher.close();
    watchers.length = 0;
    console.warn(`File watching disabled: ${error?.code || error?.message || 'unable to open watcher'}`);
  }

  const stop = () => {
    stopped = true;
    for (const watcher of watchers) watcher.close();
    clearTimeout(restartTimer);
    child?.kill();
    mediator.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    while (!stopped) {
      child = Bun.spawn(['bun', 'server.ts'], {
        env: {
          ...process.env,
          ...databaseEnv,
          PORT: String(port),
          CORE3_EVENT_MODE: 'mediator',
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
