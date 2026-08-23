import type { ServiceEndpoint, ServiceRegistry } from './registry.ts';
export type DirectCallOptions = { deadlineMs?: number; deadlineAt?: number; correlationId?: string; causationId?: string; cancelledAfter?: string; idempotencyKey?: string; signal?: AbortSignal; dispatchToken?: string; sourceService?: string };
export type DirectCall = (endpoint: ServiceEndpoint, definition: { topic: string; version: number; commandClass?: string }, payload: unknown, options?: DirectCallOptions) => Promise<unknown>;
export function createDirectCaller(inproc: Map<string, (definition: any, payload: unknown, options: DirectCallOptions) => Promise<unknown> | unknown>, fetcher: typeof fetch = fetch): DirectCall { return async (endpoint, definition, payload, options = {}) => { if (endpoint.execution === 'inproc') { const handler = inproc.get(endpoint.serviceId); if (!handler) throw new Error(`In-process service is not loaded: ${endpoint.serviceId}`); return handler(definition, payload, options); } const headers = new Headers({ 'content-type': 'application/json', 'x-topic': definition.topic, 'x-topic-version': String(definition.version), 'x-service-id': endpoint.serviceId, 'x-command-class': definition.commandClass || definition.topic }); if (options.dispatchToken) headers.set('authorization', `Bearer ${options.dispatchToken}`); if (options.sourceService) headers.set('x-source-service', options.sourceService); for (const [key, value] of [['x-correlation-id', options.correlationId], ['x-causation-id', options.causationId], ['x-cancelled-after', options.cancelledAfter], ['x-idempotency-key', options.idempotencyKey]] as const) if (value) headers.set(key, value); let signal = options.signal; let timer: ReturnType<typeof setTimeout> | undefined; const deadlineAt = options.deadlineAt || (options.deadlineMs ? Date.now() + options.deadlineMs : undefined); if (deadlineAt) { headers.set('x-deadline-at', String(deadlineAt)); const controller = new AbortController(); const abort = () => controller.abort(); if (signal) { if (signal.aborted) controller.abort(); else signal.addEventListener('abort', abort, { once: true }); } timer = setTimeout(abort, Math.max(0, deadlineAt - Date.now())); signal = controller.signal; } try { const response = await fetcher(new URL(endpoint.dispatchPath || '/internal/dispatch', endpoint.baseUrl), { method: 'POST', headers, body: JSON.stringify(payload), signal }); if (!response.ok) throw Object.assign(new Error(`Direct call failed: ${response.status}`), { code: response.headers.get('x-error-code') || 'TARGET_UNAVAILABLE', status: response.status }); return response.json(); } finally { if (timer) clearTimeout(timer); } }; }
export async function resolveAndCall(registry: ServiceRegistry, caller: DirectCall, serviceId: string, definition: { topic: string; version: number; commandClass?: string }, payload: unknown, options: DirectCallOptions & { refresh?: () => Promise<ServiceEndpoint | null> } = {}): Promise<unknown> {
  let endpoint = registry.resolve(serviceId);
  try {
    return await caller(endpoint, definition, payload, options);
  } catch (error) {
    // Retrying a mutating request is safe only when the caller supplied its
    // inbox key. A stale endpoint can be refreshed by the registry provider;
    // non-idempotent calls surface the original transport failure untouched.
    if (!options.idempotencyKey || !options.refresh) throw error;
    const refreshed = await options.refresh();
    if (!refreshed) throw error;
    registry.register(refreshed);
    endpoint = registry.resolve(serviceId);
    return caller(endpoint, definition, payload, options);
  }
}
