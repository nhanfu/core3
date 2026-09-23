import { createServer } from 'node:net';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

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
  const serviceDirectories = readdirSync('services', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`services/${entry.name}/manifest.yaml`))
    .map((entry) => entry.name);
  const serviceIds = serviceDirectories.map((directory) => {
    const manifest = Bun.YAML.parse(readFileSync(`services/${directory}/manifest.yaml`, 'utf8')) as { id: string };
    return manifest.id;
  });
  const availableModules = new Set(serviceIds);
  const devOptions = new Set(['--demo-data', '--demo-data=true', '--schema-only', '--schema-only=true', '--memory-db', '--memory-db=true', '--memory', '--memory=true']);
  const selectedModules = new Set<string>();
  for (const argument of argumentsList) {
    if (devOptions.has(argument) || argument.startsWith('--db=')) continue;
    const moduleId = argument.startsWith('--') && !argument.includes('=') ? argument.slice(2) : '';
    if (!availableModules.has(moduleId)) throw new Error(`Unknown dev option or module: ${argument}. Available modules: ${[...availableModules].sort().join(', ')}`);
    selectedModules.add(moduleId);
  }
  const databaseEnv: Record<string, string> = {
    CORE3_DB_DRIVER: defaultDriver,
  };
  if (selectedModules.size) databaseEnv.CORE3_MODULES = [...selectedModules].join(',');
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
  console.log(`Starting Core3 modules: ${selectedModules.size ? [...selectedModules, 'auth'].join(', ') : 'all'}`);
  console.log(`Service databases: ${serviceIds.map((serviceId) => `${serviceId}=${databaseEnv[`CORE3_${serviceId.toUpperCase().replaceAll('-', '_')}_DB_DRIVER`]}`).join(', ')}`);
  const requestedPort = Number.parseInt(process.env.PORT || '3001', 10);
  const start = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
  const port = await findAvailablePort(start);
  if (port !== start) console.log(`Port ${start} is busy; using port ${port}`);
  console.log(`App: http://127.0.0.1:${port}`);

  let stopped = false;
  let restartRequested = false;
  let child: ReturnType<typeof Bun.spawn> | null = null;
  let build: ReturnType<typeof Bun.spawn> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;

  const sourceChanged = (filename: string | Buffer | null) => {
    const path = String(filename || '').replaceAll('\\', '/');
    return /\.(ts|tsx|js|jsx|mjs|html|yaml|yml|scss|svg|png|jpe?g|webp|json)$/i.test(path)
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
    'vite.config.ts',
    'package.json',
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
    build?.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    while (!stopped) {
      build = Bun.spawn(['bun', 'run', 'frontend:build'], {
        stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
      });
      const buildExitCode = await build.exited;
      build = null;
      if (stopped) break;
      if (buildExitCode !== 0) throw new Error(`Frontend build failed with exit code ${buildExitCode}`);
      if (restartRequested) {
        restartRequested = false;
        continue;
      }
      restartRequested = false;
      child = Bun.spawn(['bun', 'server.ts'], {
        env: {
          ...process.env,
          ...databaseEnv,
          PORT: String(port),
          CORE3_FRONTEND_DIST: 'true',
          CORE3_EVENT_MODE: 'embedded',
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
