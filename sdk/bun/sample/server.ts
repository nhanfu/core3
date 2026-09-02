import { join } from 'node:path';
import { discoverModules, ModuleManager } from '@core3/server/module';
import { YamlServiceModule } from '@core3/server/yaml-service';
import { createYamlHostApi } from '@core3/server/routes/yaml-host-api';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { loadApplicationConfig } from '@core3/server/application-config';
import { FetchObjectStore, GatewayRateLimiter, HybridEventBus, MessageLog, MessageLogEventBus } from '@core3/server';
import { EventStore, EventMediatorClient, loadMedConfig, type EventBus } from '@core3/med';
import { createAiAgentApi, createHttpAgentProvider } from './services/ai/api/ai-agent-api.ts';
import { createCodexCliAgentProvider } from './services/ai/codex-agent-provider.ts';
import { createClaudeCliAgentProvider } from './services/ai/claude-agent-provider.ts';

const PORT = parseInt(process.env.PORT || '3001');
const APPS_ROOT = import.meta.dir;
const REPO_ROOT = join(APPS_ROOT, '..');
const PUBLIC_ROOT = join(APPS_ROOT, 'public');
const DIST_ROOT = join(APPS_ROOT, 'dist');
const USE_FRONTEND_DIST = process.env.CORE3_FRONTEND_DIST === 'true';
const appConfig = loadApplicationConfig(join(APPS_ROOT, 'config.yaml'), process.env);
const gatewayRateLimiter = new GatewayRateLimiter((appConfig.gateway.rate_limits || []) as any);
const moduleConfigs: Record<string, Record<string, unknown>> = {};
const medStoreConfig = await loadMedConfig();
const eventConfig: any = medStoreConfig.event_store || {};
const eventDatabase = eventConfig.database || {};
const chatEvents = Bun.YAML.parse(await Bun.file(join(APPS_ROOT, 'services/chat/events.yaml')).text()) as any;
const eventSchema = chatEvents.event_schema;
if (!eventSchema) throw new Error('Chat event schema is not configured');
const eventMode = String(appConfig.events.delivery_mode || eventConfig.mode || process.env.CORE3_EVENT_MODE || 'embedded');
const medConnectionConfig = appConfig.med || {};
const messageBackend = process.env.CORE3_MESSAGE_BACKEND === 's3' ? 's3' : 'local';
const messageBucket = process.env.CORE3_S3_BUCKET || 'core3-messages';
const messageRegion = process.env.CORE3_S3_REGION || 'us-east-1';
const messageEndpoint = process.env.CORE3_S3_ENDPOINT || (messageRegion === 'us-east-1' ? 'https://s3.amazonaws.com' : `https://s3.${messageRegion}.amazonaws.com`);
const messagePath = process.env.CORE3_MESSAGE_ROOT || join(String(eventDatabase.path || process.env.CORE3_EVENT_DB_PATH || '../coredb/events-parquet'), 'message-log');
const messageLogEventBus = (eventMode === 'message_log' || appConfig.events.message_log_pairs.length > 0)
  ? new MessageLogEventBus(new MessageLog({ name: 'core3-events', append_only: true, format: 'parquet', backend: messageBackend, path: messagePath, bucket: messageBucket, prefix: process.env.CORE3_S3_PREFIX || 'core3-events', endpoint: process.env.CORE3_S3_ENDPOINT || undefined, write_mode: 'durable' }, messageBackend === 's3'
    ? { objectStore: new FetchObjectStore(messageEndpoint, messageBucket, { accessKeyId: process.env.CORE3_S3_ACCESS_KEY, secretAccessKey: process.env.CORE3_S3_SECRET_KEY, region: messageRegion, token: process.env.CORE3_S3_TOKEN }) }
    : undefined))
  : null;
const legacyEventBus: EventBus = eventMode === 'mediator'
  ? new EventMediatorClient({
    endpoint: String(medConnectionConfig.endpoint || process.env.CORE3_EVENT_MEDIATOR_URL || 'ws://127.0.0.1:3010/events'),
    token: String(medConnectionConfig.token || process.env.CORE3_EVENT_MEDIATOR_TOKEN || ''),
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
const eventBus: EventBus = eventMode === 'message_log'
  ? messageLogEventBus!
  : appConfig.events.message_log_pairs.length
    ? new HybridEventBus(legacyEventBus, messageLogEventBus!, appConfig.events.message_log_pairs)
    : legacyEventBus;
await eventBus.start();

async function seedChatEvents(): Promise<void> {
  if (appConfig.environment !== 'development') return;
  const seeds = Array.isArray(chatEvents.seed_events) ? chatEvents.seed_events : [];
  if (!seeds.length) return;
  const existing = await eventBus.poll({ topic: 'chat.message.created', afterSequence: 0, maxEvents: 10000, maxWaitMs: 0 });
  const keys = new Set(existing.map((event: any) => String(event.key || '')));
  for (const seed of seeds) {
    const key = String(seed.key || '');
    if (!key || keys.has(key)) continue;
    await eventBus.publish({ ...seed, key });
    keys.add(key);
  }
}

await seedChatEvents();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function apiError(status: number, message: string, code?: string, messageKey?: string, messageParams?: Record<string, unknown>, debugDetail?: string): Response {
  return new Response(JSON.stringify({
    error: message,
    ...(code ? { code } : {}),
    message_key: messageKey || (code ? `errors.${String(code).toLowerCase()}` : (status >= 500 ? 'errors.internal_error' : `errors.http_${status}`)),
    ...(messageParams ? { message_params: messageParams } : {}),
    ...(appConfig.environment === 'development' && debugDetail ? { detail: debugDetail } : {}),
  }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function moduleRoute(moduleId: string, route: string): string {
  const path = route.startsWith('/') ? route : `/${route}`;
  if (path === `/${moduleId}` || path.startsWith(`/${moduleId}/`)) return path;
  if (path.replace(/\/$/, '') === `/${moduleId}`) return `/${moduleId}`;
  return `/${moduleId}${path}`.replace(/\/$/, '') || '/';
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
    const distFile = Bun.file(join(DIST_ROOT, rel));
    const publicFile = Bun.file(join(PUBLIC_ROOT, rel));
    const appFile = Bun.file(join(APPS_ROOT, rel));
    const packageFile = Bun.file(join(REPO_ROOT, rel));
    const file = USE_FRONTEND_DIST && await distFile.exists()
      ? distFile
      : await publicFile.exists() ? publicFile : await appFile.exists() ? appFile : packageFile;
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
  const distFile = Bun.file(join(DIST_ROOT, 'index.html'));
  const publicFile = Bun.file(join(PUBLIC_ROOT, 'index.html'));
  const file = USE_FRONTEND_DIST && await distFile.exists() ? distFile : publicFile;
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
        ? moduleRoute(module.id, pageRoutes.find((route) => route.page === page.id)!.path)
        : null,
      title: page.config?.title || page.id,
    })),
  routes: pageRoutes.filter((route) => route.module === module.id)
    .map((route) => ({ ...route, path: moduleRoute(module.id, route.path) })),
}));
await moduleManager.loadAll({ appsRoot: APPS_ROOT, env: process.env, moduleConfigs, serviceConfigs: moduleConfigs, eventBus });
const yamlServiceContexts = modules
  .filter((module): module is YamlServiceModule => module instanceof YamlServiceModule)
  .map((module) => module.getRuntimeContext())
  .filter((context): context is NonNullable<typeof context> => Boolean(context));
const yamlApiHandlers = yamlServiceContexts.map((context) => context.api);
const providerEndpoint = String(process.env.CORE3_AI_AGENT_PROVIDER_URL || '').trim();
const providerName = String(process.env.CORE3_AI_AGENT_PROVIDER || '').trim().toLowerCase();
const codexProvider = createCodexCliAgentProvider({
  bin: String(process.env.CORE3_CODEX_BIN || 'codex'),
  model: String(process.env.CORE3_AI_AGENT_MODEL || '').trim() || undefined,
});
const claudeProvider = createClaudeCliAgentProvider({
  bin: String(process.env.CORE3_CLAUDE_BIN || 'claude'),
  model: String(process.env.CORE3_AI_AGENT_MODEL || '').trim() || undefined,
});
const defaultProvider = providerEndpoint
  ? createHttpAgentProvider(providerEndpoint, String(process.env.CORE3_AI_AGENT_PROVIDER_KEY || ''))
  : providerName === 'claude' ? claudeProvider : codexProvider;
moduleManager.apiHandlers.unshift(createAiAgentApi({
  appsRoot: APPS_ROOT,
  authProvider: moduleManager.resolveService('auth.adapter') as any,
  provider: defaultProvider,
  providers: { codex: codexProvider, claude: claudeProvider },
  invoke: async (request, url) => {
    for (const handler of yamlApiHandlers) {
      const response = await handler(request.clone(), url);
      if (response && response.status !== 404) return response;
    }
    return null;
  },
}));
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
          ? route.replace(/\/$/, '') || '/'
          : moduleRoute(moduleId, route);
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
    const deadlineAt = Number(req.headers.get('x-deadline-at') || 0);
    if (deadlineAt && Date.now() >= deadlineAt) return apiError(408, 'Deadline exceeded', 'DEADLINE_EXCEEDED');

    if (url.pathname.startsWith('/api/')) {
      const decision = gatewayRateLimiter.check({
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        routeClass: url.pathname.startsWith('/api/auth/') ? 'auth' : 'api',
      });
      if (!decision.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(decision.retryAfter / 1000)), 'X-RateLimit-Limit': String(decision.limit), 'X-RateLimit-Remaining': String(decision.remaining), 'X-RateLimit-Reset': String(Math.ceil(decision.resetAt / 1000)), ...CORS_HEADERS } });
      const hasUserRule = (appConfig.gateway.rate_limits as any[]).some((rule) => rule?.scope === 'user');
      if (hasUserRule && !url.pathname.startsWith('/api/auth/login')) {
        try {
          const user = await (moduleManager.resolveService<any>('auth.adapter')).getCurrentUser(req);
          const userDecision = gatewayRateLimiter.check({ ip: 'authenticated', userId: String(user.sub), routeClass: 'api', service: url.pathname.split('/')[2] || undefined });
          if (!userDecision.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(userDecision.retryAfter / 1000)), 'X-RateLimit-Limit': String(userDecision.limit), 'X-RateLimit-Remaining': String(userDecision.remaining), 'X-RateLimit-Reset': String(Math.ceil(userDecision.resetAt / 1000)), ...CORS_HEADERS } });
        } catch { /* the downstream auth handler owns the final 401 response */ }
      }
    }

    if (url.pathname === '/internal/registry' && req.method === 'GET') {
      const registryToken = process.env.CORE3_SERVICE_REGISTRY_TOKEN || process.env.CORE3_AUTH_WORKLOAD_TOKEN || '';
      const suppliedToken = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!registryToken || suppliedToken !== registryToken) return apiError(401, 'Registry credential required', 'REGISTRY_UNAUTHORIZED');
      return new Response(JSON.stringify(moduleManager.registry.list()), { headers: { 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/internal/dispatch' && req.method === 'POST') {
      try {
        const deadlineAt = Number(req.headers.get('x-deadline-at') || 0);
        if (deadlineAt && Date.now() >= deadlineAt) return apiError(408, 'Deadline exceeded', 'DEADLINE_EXCEEDED');
        const serviceId = String(req.headers.get('x-service-id') || '');
        const operation = String(req.headers.get('x-topic') || '');
        const commandClass = String(req.headers.get('x-command-class') || operation);
        const authz = String(req.headers.get('authorization') || '');
        const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
        const authority: any = moduleManager.resolveService('auth.authority');
        const claims = await authority.verify(token, serviceId, { source_service: req.headers.get('x-source-service') || undefined, command_class: commandClass });
        const idempotencyKey = req.headers.get('x-idempotency-key');
        const inbox = idempotencyKey ? moduleManager.idempotencyInbox(serviceId) : null;
        const reservation = idempotencyKey ? inbox!.begin(idempotencyKey) : { fresh: true };
        if (!reservation.fresh) return new Response(JSON.stringify(reservation.response), { headers: { 'Content-Type': 'application/json', 'X-Idempotent-Replay': 'true' } });
        const body = await req.json().catch(() => ({}));
        const result = await moduleManager.dispatch(serviceId, operation, { ...(body && typeof body === 'object' ? body : {}), actor: { id: claims.sub, permissions: claims.permissions, session_id: claims.sid, device_id: claims.did }, transport: { correlation_id: req.headers.get('x-correlation-id') || undefined, causation_id: req.headers.get('x-causation-id') || undefined, deadline_at: deadlineAt || undefined, cancelled_after: req.headers.get('x-cancelled-after') || undefined } }, { deadlineAt: deadlineAt || undefined, correlationId: req.headers.get('x-correlation-id') || undefined, causationId: req.headers.get('x-causation-id') || undefined, cancelledAfter: req.headers.get('x-cancelled-after') || undefined, idempotencyKey: idempotencyKey || undefined });
        if (idempotencyKey) inbox!.complete(idempotencyKey, result);
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        const failedKey = req.headers.get('x-idempotency-key');
        if (failedKey) moduleManager.idempotencyInbox(String(req.headers.get('x-service-id') || '')).fail(failedKey);
        const failure = error as any;
        return apiError(failure?.status || 403, failure?.message || 'Dispatch rejected', failure?.code || 'DISPATCH_REJECTED');
      }
    }

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
        if (url.pathname === '/api/mutate' && req.method === 'POST') {
          const body = await req.json().catch(() => ({}));
          const mutation = body && typeof body === 'object' ? String(body.mutation || '') : '';
          if (!mutation) return apiError(400, 'mutation is required', 'MUTATION_REQUIRED');
          const actionUrl = new URL(`/api/actions/${encodeURIComponent(mutation)}`, url);
          const actionRequest = new Request(actionUrl, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(body),
          });
          const response = await moduleManager.handle(actionRequest, actionUrl, server);
          if (response) return response;
        }
        const response = await moduleManager.handle(req, url, server);
        if (response === undefined) return;
        return response ?? apiError(404, 'API route not found');
      } catch (error) {
        const failure = error as any;
        if (failure?.status) return apiError(failure.status, failure.message, failure.code, failure.message_key, failure.message_params, failure.stack || failure.detail);
        console.error('[API error]', error);
        return apiError(500, 'Internal server error', 'INTERNAL_ERROR', 'errors.internal_error', undefined, failure?.stack || String(failure?.message || error));
      }
    }

    if (req.method === 'GET') return (await serveStatic(url.pathname)) || serveSPA();
    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Core3 server running at http://localhost:${PORT}`);
