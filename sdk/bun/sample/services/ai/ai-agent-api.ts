import { join, normalize, relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { discoverPages } from '@core3/server/discovery';
import type { AgentApiCall, AgentPart, AgentProvider } from './ai-agent-contract.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type AgentOperation = {
  id: string;
  route: string;
  method?: string;
  permission: string;
  permissions?: string[];
  preview?: boolean;
  read_only?: boolean;
  datasource?: string;
};

type AgentPage = {
  id: string;
  title?: string;
  permissions: string[];
};

type PendingCall = {
  actorId: string;
  call: AgentApiCall;
  operation: AgentOperation;
  createdAt: number;
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(status: number, message: string, code: string) {
  return json({ error: message, code }, status);
}

function actorId(user: any) {
  return String(user?.sub || user?.id || '');
}

function hasPermission(authProvider: any, user: any, permission: string) {
  return authProvider.hasPermission(user, permission);
}

function safeYamlPath(appsRoot: string, value: string) {
  const root = normalize(resolve(appsRoot));
  const candidate = normalize(join(root, value));
  const rel = relative(root, candidate).replaceAll('\\', '/');
  if (!rel || rel.startsWith('../') || rel.includes('/../') || !/\.ya?ml$/i.test(rel)) return null;
  if (!/(^|\/)(pages|workflows|permissions|manifest|agent)\.ya?ml$/i.test(rel)
    && !/(^|\/)(pages|workflows)\//i.test(rel)) return null;
  return candidate;
}

async function yamlContext(appsRoot: string, paths: string[] = []): Promise<Array<{ path: string; content: string }>> {
  let configured: string[] = [];
  try {
    const agent = Bun.YAML.parse(readFileSync(join(appsRoot, 'services/ai/agent.yaml'), 'utf8')) as any;
    configured = Array.isArray(agent?.context_paths) ? agent.context_paths.map(String) : [];
  } catch { /* use the minimal safe fallback below */ }
  const selected = paths.length ? paths : (configured.length ? configured : [
    'services/ai/agent.yaml', 'services/ai/permissions.yaml',
  ]);
  const context: Array<{ path: string; content: string }> = [];
  for (const path of selected.slice(0, 20)) {
    const file = safeYamlPath(appsRoot, path);
    if (!file) continue;
    const content = await Bun.file(file).text().catch(() => '');
    if (content) context.push({ path: relative(appsRoot, file).replaceAll('\\', '/'), content: content.slice(0, 120_000) });
  }
  return context;
}

function operationMap(appsRoot: string): Map<string, AgentOperation> {
  const file = join(appsRoot, 'services/ai/agent.yaml');
  const operations = new Map<string, AgentOperation>();
  try {
    const config = Bun.YAML.parse(readFileSync(file, 'utf8')) as any;
    for (const entry of Array.isArray(config?.operations) ? config.operations : []) {
      if (entry?.id && entry?.route && entry?.permission) operations.set(String(entry.id), entry);
    }
  } catch { /* discovered page actions remain available */ }
  try {
    const discovered = discoverPages(appsRoot);
    for (const page of discovered.pages.values()) {
      for (const action of Array.isArray(page.config?.actions) ? page.config.actions : []) {
        if ((action?.type !== 'server' && action?.type !== 'server_form') || !action.action || !action.permission) continue;
        const id = String(action.action);
        if (!operations.has(id)) operations.set(id, {
          id,
          route: `/api/actions/${encodeURIComponent(id)}`,
          method: 'POST',
          permission: String(action.permission),
          preview: false,
        });
      }
    }
    for (const [datasource, source] of discovered.datasources.entries()) {
      if (!source?.permission) continue;
      const id = `datasource.${datasource}.query`;
      if (!operations.has(id)) operations.set(id, {
        id,
        route: '/api/query',
        method: 'POST',
        permission: String(source.permission),
        read_only: true,
        datasource: String(datasource),
      });
    }
  } catch { /* page discovery errors are reported by normal server startup */ }
  return operations;
}

function pageMap(appsRoot: string): Map<string, AgentPage> {
  try {
    const discovered = discoverPages(appsRoot);
    return new Map([...discovered.pages.values()].map((entry: any) => [entry.id, {
      id: entry.id,
      title: String(entry.config?.title || entry.id),
      permissions: Array.isArray(entry.config?.page?.auth?.require)
        ? entry.config.page.auth.require.map(String)
        : [],
    }]));
  } catch {
    return new Map();
  }
}

function datasourceCatalog(appsRoot: string) {
  try {
    const discovered = discoverPages(appsRoot);
    return [...discovered.datasources.entries()].map(([id, source]: [string, any]) => ({
      id,
      permission: source.permission ? String(source.permission) : undefined,
      query: typeof source.query === 'string' ? source.query.slice(0, 20_000) : undefined,
      workflow: typeof source.workflow === 'string' ? source.workflow : undefined,
    }));
  } catch {
    return [];
  }
}

function tokenFrom(request: Request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export function createHttpAgentProvider(endpoint: string, apiKey = ''): AgentProvider {
  return {
    async generate(input) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw { status: 502, message: 'AI provider request failed', code: 'AI_PROVIDER_FAILED' };
      return await response.json() as any;
    },
  };
}

export function createAiAgentApi(options: {
  appsRoot: string;
  authProvider: { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean };
  provider: AgentProvider;
  invoke: (request: Request, url: URL) => Promise<Response | null | undefined>;
}) {
  const pending = new Map<string, PendingCall>();
  const operations = operationMap(options.appsRoot);
  const pages = pageMap(options.appsRoot);
  const datasources = datasourceCatalog(options.appsRoot);

  async function execute(request: Request, call: AgentApiCall, operation: AgentOperation, user: any) {
    const token = tokenFrom(request);
    const url = new URL(operation.route, request.url);
    const values = operation.datasource
      ? { ...(call.values || {}), sourceId: operation.datasource }
      : call.values || {};
    const downstream = new Request(url, {
      method: operation.method || 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const response = await options.invoke(downstream, url);
    if (!response || response.status === 404) throw { status: 404, message: 'Registered Core3 operation was not found', code: 'AI_OPERATION_NOT_FOUND' };
    return response;
  }

  return async (request: Request, url: URL): Promise<Response | null> => {
    if (!url.pathname.startsWith('/api/ai/agent')) return null;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'POST') return error(405, 'Only POST is supported', 'METHOD_NOT_ALLOWED');

    let user: any;
    try { user = await options.authProvider.getCurrentUser(request); } catch { return error(401, 'Authentication required', 'UNAUTHENTICATED'); }
    if (!hasPermission(options.authProvider, user, 'ai.write')) return error(403, 'AI access is not permitted', 'AI_PERMISSION_REQUIRED');
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || '').trim();

    if (url.pathname === '/api/ai/agent/confirm') {
      const id = String(body?.preview_id || '');
      const item = pending.get(id);
      if (!item || item.actorId !== actorId(user) || Date.now() - item.createdAt > 10 * 60_000) return error(409, 'Preview is missing or expired', 'PREVIEW_EXPIRED');
      pending.delete(id);
      if (!hasPermission(options.authProvider, user, item.operation.permission)) return error(403, `Requires permission: ${item.operation.permission}`, 'OPERATION_PERMISSION_REQUIRED');
      const result = await execute(request, item.call, item.operation, user);
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) return error(result.status, String(payload?.error || 'Operation failed'), String(payload?.code || 'AI_OPERATION_FAILED'));
      return json({ parts: [{ type: 'result', title: 'Operation completed', summary: payload }] });
    }
    if (!prompt || prompt.length > 12_000) return error(400, 'Prompt must be between 1 and 12000 characters', 'INVALID_PROMPT');

    const context = await yamlContext(options.appsRoot, Array.isArray(body?.yaml_paths) ? body.yaml_paths.map(String) : []);
    let generated;
    try {
      const userPermissions = new Set<string>(Array.isArray(user?.permissions) ? user.permissions.map(String) : []);
      for (const operation of operations.values()) {
        if (hasPermission(options.authProvider, user, operation.permission)) userPermissions.add(operation.permission);
      }
      for (const page of pages.values()) {
        for (const permission of page.permissions) {
          if (hasPermission(options.authProvider, user, permission)) userPermissions.add(permission);
        }
      }
      const accessiblePages = [...pages.values()].filter((page) => page.permissions.every((permission) => hasPermission(options.authProvider, user, permission)));
      const accessibleOperations = [...operations.values()].filter((operation) => hasPermission(options.authProvider, user, operation.permission) && (operation.permissions || []).every((permission) => hasPermission(options.authProvider, user, permission)));
      generated = await options.provider.generate({
        prompt,
        user: {
          id: actorId(user),
          name: String(user?.name || user?.email || ''),
          roles: Array.isArray(user?.roles) ? user.roles.map(String) : [],
          permissions: [...userPermissions],
        },
        yaml_context: context,
        operations: accessibleOperations,
        pages: accessiblePages,
        datasources: datasources.filter((source) => !source.permission || hasPermission(options.authProvider, user, source.permission)),
      });
    } catch (failure: any) {
      return error(Number(failure?.status) || 502, String(failure?.message || 'AI provider request failed'), String(failure?.code || 'AI_PROVIDER_FAILED'));
    }
    const parts: AgentPart[] = Array.isArray(generated?.parts) ? generated.parts : [];
    for (const part of parts) {
      if (part.type !== 'preview' || !part.page) continue;
      const page = pages.get(String(part.page));
      if (!page || !page.permissions.every((permission) => hasPermission(options.authProvider, user, permission))) {
        return error(403, `Page preview is not permitted: ${part.page}`, 'AI_PAGE_NOT_ALLOWED');
      }
    }
    for (const call of Array.isArray(generated?.calls) ? generated.calls : []) {
      const operation = operations.get(String(call?.operation || ''));
      if (!operation || !operation.route.startsWith('/api/')) return error(400, 'Agent attempted an undeclared operation', 'AI_OPERATION_NOT_ALLOWED');
      if (!hasPermission(options.authProvider, user, operation.permission)) return error(403, `Requires permission: ${operation.permission}`, 'OPERATION_PERMISSION_REQUIRED');
      for (const permission of operation.permissions || []) if (!hasPermission(options.authProvider, user, permission)) return error(403, `Requires permission: ${permission}`, 'OPERATION_PERMISSION_REQUIRED');
      if (operation.read_only) {
        const result = await execute(request, call, operation, user);
        if (!result.ok) return error(result.status, 'Datasource query failed', 'AI_QUERY_FAILED');
        const payload = await result.json().catch(() => ({}));
        parts.push({ type: 'result', title: `${operation.datasource || 'Datasource'} query result`, summary: payload });
        continue;
      }
      const previewId = crypto.randomUUID();
      pending.set(previewId, { actorId: actorId(user), call: { ...call, requires_confirmation: true }, operation, createdAt: Date.now() });
      parts.push({ type: 'approval', preview_id: previewId, action_label: `Confirm ${operation.id}`, warning: `Requires ${operation.permission}` });
    }
    return json({ parts, yaml_context: context.map((entry) => entry.path) });
  };
}
