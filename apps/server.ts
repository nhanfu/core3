import { join } from 'node:path';
import { discoverModules, ModuleManager } from '@core3/server/module';
import { YamlServiceModule } from '@core3/server/yaml-service';
import { createYamlHostApi } from '@core3/server/routes/yaml-host-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { loadApplicationConfig, resolveEnvironmentValues } from '@core3/server/application-config';
import { EventStore, type EventBus } from '@core3/server/event-store';
import { EventMediatorClient } from '@core3/server/event-mediator';

const PORT = parseInt(process.env.PORT || '3001');
const APPS_ROOT = import.meta.dir;
const REPO_ROOT = join(APPS_ROOT, '..');
const PUBLIC_ROOT = join(APPS_ROOT, 'public');
const appConfig = loadApplicationConfig(join(APPS_ROOT, 'config.yaml'), process.env);
const moduleConfigs = Object.fromEntries(Object.entries(appConfig.services).map(([id, config]) => [
  id,
  resolveEnvironmentValues(config, appConfig.environment) as Record<string, unknown>,
]));

const eventConfig: any = moduleConfigs.event_store || {};
const eventDatabase = eventConfig.database || {};
const eventSchema = eventConfig.schema || moduleConfigs.chat?.event_schema;
if (!eventSchema) throw new Error('Chat event schema is not configured');
const eventMode = String(eventConfig.mode || process.env.CORE3_EVENT_MODE || 'embedded');
const eventBus: EventBus = eventMode === 'mediator'
  ? new EventMediatorClient({
    endpoint: String(eventConfig.mediator?.endpoint || process.env.CORE3_EVENT_MEDIATOR_URL || 'ws://127.0.0.1:3010/events'),
    token: String(eventConfig.mediator?.token || process.env.CORE3_EVENT_MEDIATOR_TOKEN || ''),
    nodeId: String(eventConfig.mediator?.node_id || process.env.CORE3_NODE_ID || `core3-${process.pid}`),
    reconnectMs: Number(eventConfig.mediator?.reconnect_ms || 1000),
    segmentMaxRows: Number(eventConfig.segment_max_rows || 200),
    pullBatchSize: Number(eventConfig.pull_batch_size || 100),
  })
  : new EventStore({
    schema: eventSchema,
    databasePath: eventDatabase.path || process.env.CORE3_EVENT_DB_PATH || '../coredb/events-parquet',
    retentionMs: Number(eventConfig.retention_ms || 60 * 60 * 1000),
    maxRows: Number(eventConfig.max_rows || 1000),
    hotMaxRows: Number(eventConfig.hot_max_rows || 100000),
    hotMaxBytes: Number(eventConfig.hot_max_bytes || 128 * 1024 * 1024),
    hotRetentionMs: Number(eventConfig.hot_retention_ms || 60 * 60 * 1000),
    hotConsumerTtlMs: Number(eventConfig.hot_consumer_ttl_ms || 30000),
    segmentMaxRows: Number(eventConfig.segment_max_rows || 1000),
    pullBatchSize: Number(eventConfig.pull_batch_size || 100),
    readerCount: Number(eventConfig.reader_connections || 2),
    bufferMaxRows: Number(eventConfig.buffer_max_rows || 10000),
    writeMode: eventConfig.write_mode || 'low_latency',
  });
await eventBus.start();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function apiError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'application/javascript',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function mimeFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.')) as keyof typeof MIME;
  return MIME[ext] || 'application/octet-stream';
}

async function serveStatic(pathname: string) {
  const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (rel.includes('..')) return null;
  // Page YAML may contain server-only datasource SQL.
  if (/(^|\/)pages\/.+\.ya?ml$/i.test(rel)) return null;
  try {
    const publicFile = Bun.file(join(PUBLIC_ROOT, rel));
    const appFile = Bun.file(join(APPS_ROOT, rel));
    const packageFile = Bun.file(join(REPO_ROOT, rel));
    const file = await publicFile.exists() ? publicFile : await appFile.exists() ? appFile : packageFile;
    if (!(await file.exists())) return null;
    if (rel.endsWith('.ts')) {
      const transpiler = new Bun.Transpiler({ loader: 'ts' });
      return new Response(transpiler.transformSync(await file.text()), {
        headers: { 'Content-Type': 'application/javascript', ...CORS_HEADERS },
      });
    }
    return new Response(file, { headers: { 'Content-Type': mimeFor(rel), ...CORS_HEADERS } });
  } catch {
    return null;
  }
}

async function serveSPA() {
  const file = Bun.file(join(PUBLIC_ROOT, 'index.html'));
  if (await file.exists()) {
    return new Response(file, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS } });
  }
  return new Response('Core3 server running. No index.html found.', {
    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
  });
}

const modules = await discoverModules(APPS_ROOT);
const moduleManager = new ModuleManager(modules);
const pageDiscovery = discoverPages(APPS_ROOT);
const pageRoutes = discoverPageRoutes(pageDiscovery);
const moduleManifest = modules.map((module) => ({
  id: module.id,
  pages: [...pageDiscovery.pages.values()]
    .filter((page) => page.module === module.id)
    .map((page) => ({
      id: page.id,
      route: pageRoutes.find((route) => route.page === page.id)?.path
        ? `/${module.id}${pageRoutes.find((route) => route.page === page.id)!.path}`
        : null,
      title: page.config?.title || page.id,
    })),
  routes: pageRoutes.filter((route) => route.module === module.id)
    .map((route) => ({ ...route, path: `/${module.id}${route.path}` })),
}));
await moduleManager.loadAll({ appsRoot: APPS_ROOT, env: process.env, moduleConfigs, serviceConfigs: moduleConfigs, eventBus });
const yamlServiceContexts = modules
  .filter((module): module is YamlServiceModule => module instanceof YamlServiceModule)
  .map((module) => module.getRuntimeContext())
  .filter((context): context is NonNullable<typeof context> => Boolean(context));
if (yamlServiceContexts.length) moduleManager.apiHandlers.unshift(createYamlHostApi(yamlServiceContexts));

async function applicationCatalog() {
  try {
    const moduleIds = new Set(modules.map((module) => module.id));
    return appConfig.apps.map((app) => ({
      ...app,
      route: (() => {
        const moduleId = String(app.module || app.id);
        const route = String(app.route || '/dashboard');
        return route === `/${moduleId}` || route.startsWith(`/${moduleId}/`)
          ? route
          : `/${moduleId}${route.startsWith('/') ? route : `/${route}`}`;
      })(),
      available: app.enabled !== false && moduleIds.has(String(app.module || app.id)),
    }));
  } catch {
    return moduleManager.metadata.map((module) => ({
      id: module.id, label: module.id, route: `/${module.id}/dashboard`, module: module.id, available: true,
    }));
  }
}

const shutdown = async () => {
  await moduleManager.unloadAll({ appsRoot: APPS_ROOT, env: process.env, moduleConfigs, serviceConfigs: moduleConfigs, eventBus });
  await eventBus.stop();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

Bun.serve({
  port: PORT,
  websocket: {
    open(ws: any) {
      ws.data?.onOpen?.(ws);
    },
    message(ws: any, message: string | ArrayBuffer) {
      const handler = ws.data?.onMessage;
      if (typeof handler === 'function') {
        Promise.resolve(handler(ws, message)).catch((error) => console.error('[WebSocket error]', error));
      }
    },
    close(ws: any) {
      ws.data?.onClose?.(ws);
    },
  },
  async fetch(req: Request, server: any) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/modules' && req.method === 'GET') {
          return new Response(JSON.stringify(moduleManifest), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS },
          });
        }
        if (url.pathname === '/api/apps' && req.method === 'GET') {
          return new Response(JSON.stringify(await applicationCatalog()), {
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }
        const response = await moduleManager.handle(req, url, server);
        if (response === undefined) return;
        return response ?? apiError(404, 'API route not found');
      } catch (error) {
        const failure = error as any;
        if (failure?.status) return apiError(failure.status, failure.message);
        console.error('[API error]', error);
        return apiError(500, 'Internal server error');
      }
    }

    if (req.method === 'GET') return (await serveStatic(url.pathname)) || serveSPA();
    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Core3 server running at http://localhost:${PORT}`);
