import { join } from 'node:path';
import { loadApplicationConfig } from '@core3/server/application-config';
import { DispatchTokenCache, GatewayRateLimiter, HttpServiceRegistryClient } from '@core3/server';

const port = Number(process.env.PORT || 3001);
const applicationConfig = loadApplicationConfig(join(import.meta.dir, '..', 'config.yaml'), process.env);
const target = String(applicationConfig.runtime.service_host_url || process.env.CORE3_SERVICE_HOST_URL || 'http://127.0.0.1:3003');
const limiter = new GatewayRateLimiter((applicationConfig.gateway.rate_limits || []) as any);
const dispatchTokens = new DispatchTokenCache(Number(process.env.CORE3_DISPATCH_CACHE_MAX || 2048));
const registry = new HttpServiceRegistryClient(target, fetch, Date.now, 1000, process.env.CORE3_SERVICE_REGISTRY_TOKEN || process.env.CORE3_AUTH_WORKLOAD_TOKEN);
const dispatchMode = applicationConfig.gateway.dispatch_mode;
const enforcedCommands = new Set(applicationConfig.gateway.dispatch_enforced_commands);

async function serviceUrl(serviceId: string, path: string): Promise<URL> {
  const endpoint = await registry.resolve(serviceId);
  return new URL(path, endpoint.baseUrl);
}

function commandIsMigrated(serviceId: string, commandClass: string): boolean {
  return enforcedCommands.has(commandClass) || enforcedCommands.has(`${serviceId}:${commandClass}`);
}

async function mintDispatchToken(identity: any, targetService: string, commandClass: string, requiredPermission?: string): Promise<string> {
  const cacheKey = { did: identity.did, sid: identity.sid, clientJti: identity.jti, targetService, commandClass, userSecurityRevision: identity.user_security_revision, sessionRevision: identity.session_revision, authzVersion: identity.authz_version };
  return dispatchTokens.getOrCreate(cacheKey, async () => {
    const dispatchResponse = await fetch(await serviceUrl('auth', '/api/auth/dispatch'), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.CORE3_AUTH_WORKLOAD_TOKEN || ''}` }, body: JSON.stringify({ subject: identity.sub, device_id: identity.did, session_id: identity.sid, parent_jti: identity.jti, source_service: 'gateway', target_service: targetService, command_class: commandClass, required_permission: requiredPermission }) });
    if (!dispatchResponse.ok) throw Object.assign(new Error(await dispatchResponse.text()), { status: dispatchResponse.status, response: dispatchResponse });
    const dispatch = await dispatchResponse.json() as any;
    if (!dispatch.token) throw new Error('Auth did not return a dispatch token');
    return String(dispatch.token);
  }, identity.exp ? Number(identity.exp) * 1000 : undefined);
}

function forwardedHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-for', request.headers.get('x-forwarded-for') || '127.0.0.1');
  headers.set('x-correlation-id', request.headers.get('x-correlation-id') || crypto.randomUUID());
  return headers;
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/internal/call' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const targetService = String(body.target_service || '');
        const commandClass = String(body.command_class || '');
        const operation = String(body.operation || commandClass);
        if (!targetService || !commandClass) return new Response(JSON.stringify({ error: 'target_service and command_class are required' }), { status: 400, headers: { 'content-type': 'application/json' } });
        const identityResponse = await fetch(await serviceUrl('auth', '/api/auth/me'), { headers: { authorization: request.headers.get('authorization') || '' } });
        if (!identityResponse.ok) return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), { status: 401, headers: { 'content-type': 'application/json' } });
        const identity = await identityResponse.json() as any;
        let dispatchToken: string;
        try {
          dispatchToken = await mintDispatchToken(identity, targetService, commandClass, body.required_permission);
        } catch (error: any) {
          return new Response(error?.response ? await error.response.text() : JSON.stringify({ error: 'Dispatch token unavailable', code: error?.code || 'AUTH_UNAVAILABLE' }), { status: error?.status || 503, headers: { 'content-type': 'application/json' } });
        }
        const headers = new Headers({ 'content-type': 'application/json', authorization: `Bearer ${dispatchToken}`, 'x-service-id': targetService, 'x-source-service': 'gateway', 'x-topic': operation, 'x-command-class': commandClass, 'x-topic-version': '1' });
        for (const name of ['x-correlation-id', 'x-causation-id', 'x-deadline-at', 'x-cancelled-after', 'x-idempotency-key']) { const value = request.headers.get(name); if (value) headers.set(name, value); }
        const targetResponse = await fetch(await serviceUrl(targetService, '/internal/dispatch'), { method: 'POST', headers, body: JSON.stringify(body.payload || {}) });
        return new Response(targetResponse.body, { status: targetResponse.status, headers: targetResponse.headers });
      } catch { return new Response(JSON.stringify({ error: 'Target unavailable', code: 'TARGET_UNAVAILABLE' }), { status: 503, headers: { 'content-type': 'application/json' } }); }
    }
    const decision = limiter.check({ ip: request.headers.get('x-forwarded-for') || 'unknown', routeClass: url.pathname.startsWith('/api/auth/') ? 'auth' : 'api' });
    if (!decision.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': String(Math.ceil(decision.retryAfter / 1000)), 'x-ratelimit-limit': String(decision.limit), 'x-ratelimit-remaining': String(decision.remaining), 'x-ratelimit-reset': String(Math.ceil(decision.resetAt / 1000)) } });
    let identity: any = null;
    if (request.headers.get('authorization') && url.pathname !== '/api/auth/login' && url.pathname !== '/api/auth/refresh') {
      let response: Response | null = null;
      try {
        response = await fetch(await serviceUrl('auth', '/api/auth/me'), { headers: { authorization: request.headers.get('authorization')! } });
      } catch {
        return new Response(JSON.stringify({ error: 'Authorization service unavailable', code: 'AUTH_UNAVAILABLE' }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
      if (response?.ok) identity = await response.json();
      else if (!url.pathname.startsWith('/api/auth/')) return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    const migratedService = request.headers.get('x-core3-target-service');
    const migratedCommand = request.headers.get('x-core3-command-class');
    if (identity && migratedService && migratedCommand && dispatchMode !== 'current' && commandIsMigrated(migratedService, migratedCommand)) {
      if (dispatchMode === 'shadow') {
        try { await mintDispatchToken(identity, migratedService, migratedCommand, request.headers.get('x-core3-required-permission') || undefined); }
        catch { return new Response(JSON.stringify({ error: 'Dispatch shadow evaluation unavailable', code: 'AUTH_UNAVAILABLE' }), { status: 503, headers: { 'content-type': 'application/json' } }); }
      } else if (dispatchMode === 'enforce') {
        const payload = request.method === 'GET' || request.method === 'HEAD' ? {} : await request.clone().json().catch(() => ({}));
        const dispatchRequest = new Request(new URL('/internal/call', request.url), { method: 'POST', headers: request.headers, body: JSON.stringify({ target_service: migratedService, command_class: migratedCommand, operation: request.headers.get('x-core3-operation') || migratedCommand, required_permission: request.headers.get('x-core3-required-permission') || undefined, payload }) });
        return fetch(dispatchRequest);
      }
    }
    if (request.headers.get('authorization') && url.pathname !== '/api/auth/login' && url.pathname !== '/api/auth/refresh') {
      const authRules = (JSON.parse(process.env.CORE3_GATEWAY_RATE_LIMITS || '[]') || []).filter((rule: any) => rule?.scope === 'user');
      if (authRules.length) {
        const userDecision = limiter.check({ ip: 'authenticated', userId: identity?.sub, routeClass: 'api', service: url.pathname.split('/')[2] || undefined });
        if (!userDecision.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': String(Math.ceil(userDecision.retryAfter / 1000)), 'x-ratelimit-limit': String(userDecision.limit), 'x-ratelimit-remaining': String(userDecision.remaining), 'x-ratelimit-reset': String(Math.ceil(userDecision.resetAt / 1000)) } });
      }
    }
    try {
      const response = await fetch(new URL(`${url.pathname}${url.search}`, target), { method: request.method, headers: forwardedHeaders(request), body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body, redirect: 'manual' });
      if (url.pathname === '/api/auth/logout' || url.pathname === '/api/auth/logout-all' || url.pathname === '/api/auth/refresh') dispatchTokens.clear();
      return response;
    } catch {
      return new Response(JSON.stringify({ error: 'Service host unavailable', code: 'TARGET_UNAVAILABLE' }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
  },
});
console.log(`Core3 gateway running at http://localhost:${port}, service host ${target}`);
