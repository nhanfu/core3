import { existsSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const moduleId = args.find((argument) => !argument.startsWith('--'));
if (!moduleId) {
  console.error('Usage: bun run agent:module -- <module> [--port=3001]');
  process.exit(1);
}

const portArgument = args.find((argument) => argument.startsWith('--port='));
const port = portArgument?.slice('--port='.length) || process.env.PORT || '3001';
const serviceIds = readdirSync('services', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`services/${entry.name}/manifest.yaml`))
  .map((entry) => entry.name);
const serviceDatabaseEnv = Object.fromEntries(serviceIds.map((serviceId) => [
  `CORE3_${serviceId.toUpperCase().replaceAll('-', '_')}_DB_DRIVER`,
  'duckdb-memory',
]));

console.log(`Starting single-module agent server: ${moduleId}`);
console.log(`Server: http://127.0.0.1:${port}`);
console.log('File watching: disabled');

const child = Bun.spawn(['bun', 'server.ts'], {
  env: {
    ...process.env,
    ...serviceDatabaseEnv,
    PORT: port,
    CORE3_MODULE: moduleId,
    CORE3_DB_DRIVER: 'duckdb-memory',
    CORE3_EVENT_MODE: 'embedded',
    CORE3_SERVICE_EXECUTION: 'inproc',
    CORE3_TOPOLOGY: 'distributed',
    CORE3_FRONTEND_DIST: 'true',
    CORE3_AUTH_DB_PATH: ':memory:',
    CORE3_EVENT_DB_PATH: ':memory:',
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

const stop = () => child.kill();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
process.exitCode = await child.exited;
