import { describe, expect, it } from 'vitest';
import { createDirectCaller, DirectTopicRouter, DispatchAuthority, DispatchSigningKeyRing, DispatchTokenCache, FetchObjectStore, GatewayRateLimiter, HttpServiceRegistryClient, HybridEventBus, IdempotencyInbox, MessageLog, MessageLogEventBus, RefreshTokenStore, ServiceNotFoundError, ServiceRegistry, resolveAndCall } from '@core3/server';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('runtime foundation', () => {
  it('expires registry entries and rejects unknown services', () => {
    let now = 0;
    const registry = new ServiceRegistry(() => now);
    registry.register({ serviceId: 'orders', instanceId: 'one', transport: 'inproc', execution: 'inproc', baseUrl: 'http://orders', ttlMs: 10 });
    expect(registry.resolve('orders').instanceId).toBe('one');
    now = 11;
    expect(() => registry.resolve('orders')).toThrow(ServiceNotFoundError);
  });

  it('refreshes a stale endpoint only for idempotent calls', async () => {
    const registry = new ServiceRegistry(() => 0);
    registry.register({ serviceId: 'orders', instanceId: 'stale', transport: 'http', execution: 'http', baseUrl: 'http://stale', ttlMs: 1000 });
    let calls = 0;
    const caller = async (endpoint: any) => { calls += 1; if (endpoint.instanceId === 'stale') throw new Error('connect failed'); return { instance: endpoint.instanceId }; };
    await expect(resolveAndCall(registry, caller, 'orders', { topic: 'orders.create', version: 1 }, {}, { idempotencyKey: 'k', refresh: async () => ({ serviceId: 'orders', instanceId: 'fresh', transport: 'http', execution: 'http', baseUrl: 'http://fresh', ttlMs: 1000 }) })).resolves.toEqual({ instance: 'fresh' });
    expect(calls).toBe(2);
    await expect(resolveAndCall(registry, async () => { throw new Error('still down'); }, 'orders', { topic: 'orders.create', version: 1 }, {}, {})).rejects.toThrow('still down');
  });

  it('resolves service endpoints through a bounded HTTP registry cache', async () => {
    let requests = 0;
    const client = new HttpServiceRegistryClient('http://registry', async () => { requests += 1; return new Response(JSON.stringify([{ serviceId: 'orders', instanceId: 'i1', transport: 'http', execution: 'http', baseUrl: 'http://orders:3000', ttlMs: 15000 }])); }, () => 0, 1000);
    await expect(client.resolve('orders')).resolves.toMatchObject({ baseUrl: 'http://orders:3000' });
    await client.resolve('orders');
    expect(requests).toBe(1);
  });

  it('applies gateway limits before downstream work', () => {
    const limiter = new GatewayRateLimiter([{ scope: 'ip', max: 1, windowMs: 1000 }], 10, () => 0);
    expect(limiter.check({ ip: '127.0.0.1' }).allowed).toBe(true);
    const rejected = limiter.check({ ip: '127.0.0.1' });
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
  });

  it('selects the authenticated user rule over the coarse IP rule', () => {
    const limiter = new GatewayRateLimiter([{ scope: 'ip', max: 100, windowMs: 1000 }, { scope: 'user', max: 1, windowMs: 1000 }], 10, () => 0);
    expect(limiter.check({ ip: 'x', userId: 'u' }).allowed).toBe(true);
    expect(limiter.check({ ip: 'x', userId: 'u' }).allowed).toBe(false);
  });

  it('evicts limiter keys by LRU and records admission metrics', () => {
    let now = 0;
    const limiter = new GatewayRateLimiter([{ scope: 'ip', max: 1, windowMs: 1000 }], 2, () => now);
    limiter.check({ ip: 'a' });
    now = 1; limiter.check({ ip: 'b' });
    now = 2; limiter.check({ ip: 'a' });
    now = 3; limiter.check({ ip: 'c' });
    expect(limiter.size()).toBe(2);
    expect(limiter.metrics()).toMatchObject({ evictions: 1, accepted: { 'ip::': 3 }, rejected: { 'ip::': 1 } });
  });

  it('dispatches YAML topic commands directly without an event transport', async () => {
    const router = new DirectTopicRouter();
    router.register({ definition: { topic: 'orders.create', version: 1, kind: 'command' }, handle: async (payload: any) => ({ id: payload.id, direct: true }) });
    await expect(router.request({ topic: 'orders.create', version: 1, kind: 'command' }, { id: 'o-direct' })).resolves.toEqual({ id: 'o-direct', direct: true });
  });

  it('issues only policy-bound dispatch tokens and rejects revocation', async () => {
    const authority = new DispatchAuthority(() => 0, undefined, () => ['orders.read']);
    authority.allow('gateway', 'orders', 'orders.read', 'orders.read');
    authority.registerSession({ userId: 'u1', deviceId: 'd1', sessionId: 's1', userSecurityRevision: 0, sessionRevision: 0, authzVersion: 1, expiresAt: 1000 });
    const token = await authority.issue({ subject: 'u1', deviceId: 'd1', sessionId: 's1', sourceService: 'gateway', targetService: 'orders', commandClass: 'orders.read', permissions: [] });
    await expect(authority.verify(token, 'orders', { source_service: 'gateway', command_class: 'orders.read' })).resolves.toMatchObject({ permissions: ['orders.read'] });
    expect((await authority.verify(token, 'orders')).authz_version).toBe(0);
    authority.bumpAuthorization('u1');
    const refreshed = await authority.issue({ subject: 'u1', deviceId: 'd1', sessionId: 's1', sourceService: 'gateway', targetService: 'orders', commandClass: 'orders.read', permissions: [] });
    await expect(authority.verify(refreshed, 'orders')).resolves.toMatchObject({ authz_version: 1 });
    authority.revokeSession('s1');
    await expect(authority.issue({ subject: 'u1', deviceId: 'd1', sessionId: 's1', sourceService: 'gateway', targetService: 'orders', commandClass: 'orders.read', permissions: [] })).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  });

  it('rotates refresh tokens and detects reuse', () => {
    const store = new RefreshTokenStore(new TextEncoder().encode('test-secret'));
    const first = store.create('u1', 'd1');
    const second = store.rotate(first.token);
    expect(second.family.generation).toBe(1);
    expect(() => store.rotate(first.token)).toThrow('reuse');
  });

  it('single-flights dispatch minting and invalidates by authorization scope', async () => {
    const cache = new DispatchTokenCache(10, 0);
    let mints = 0;
    const key = { did: 'd1', sid: 's1', clientJti: 'j1', targetService: 'orders', commandClass: 'orders.read', authzVersion: 1 };
    const mint = async () => { mints += 1; return `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.signature`; };
    await Promise.all([cache.getOrCreate(key, mint), cache.getOrCreate(key, mint)]);
    expect(mints).toBe(1);
    cache.invalidate((entry) => entry.sid === 's1');
    expect(cache.size()).toBe(0);
  });

  it('persists and tails declared Parquet messages', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-message-log-'));
    const log = new MessageLog({ name: 'orders', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' });
    await log.start();
    await log.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'o1' } });
    await log.flush();
    await expect(log.tail()).resolves.toEqual([expect.objectContaining({ type: 'order.created', payload: { order_id: 'o1' } })]);
    await log.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('recovers committed local log segments after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-message-recovery-'));
    const first = new MessageLog({ name: 'orders', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' });
    await first.start();
    await first.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'restart-1' } });
    await first.flush();
    await first.stop();
    const second = new MessageLog({ name: 'orders', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' });
    await second.start();
    await expect(second.tail()).resolves.toEqual([expect.objectContaining({ payload: { order_id: 'restart-1' } })]);
    await second.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('replays a producer log from a durable consumer cursor without duplicating the acknowledged prefix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-message-pair-'));
    const log = new MessageLog({ name: 'order-events', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' });
    await log.start();
    await log.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'pair-1' } });
    await log.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'pair-2' } });
    const firstBatch = await log.tail(await log.consumerOffset('billing'), 1);
    await log.acknowledge('billing', firstBatch[0].sequence!);
    const resumed = await log.tail(await log.consumerOffset('billing'), 10);
    expect(firstBatch).toHaveLength(1);
    expect(resumed).toEqual([expect.objectContaining({ payload: { order_id: 'pair-2' } })]);
    await log.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('delivers a message-log batch and advances its cursor only after the handler succeeds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-message-consumer-'));
    const log = new MessageLog({ name: 'order-events', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' });
    await log.start();
    await log.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'consumer-1' } });
    const seen: string[] = [];
    await expect(log.consumeBatch('billing', async (record) => { seen.push(String((record.payload as any).order_id)); })).resolves.toMatchObject({ delivered: 1 });
    expect(seen).toEqual(['consumer-1']);
    expect(await log.consumerOffset('billing')).toBe(1);
    await log.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('runs the EventBus contract over a declared message log', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-message-event-bus-'));
    const bus = new MessageLogEventBus(new MessageLog({ name: 'events', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' }));
    await bus.start();
    await bus.publish({ topic: 'orders.created', source: 'order', payload: { order_id: 'bus-1' } } as any);
    await expect(bus.poll({ topic: 'orders.created' })).resolves.toEqual([expect.objectContaining({ topic: 'orders.created', payload: { order_id: 'bus-1' } })]);
    await bus.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('routes migrated topics to the message log while preserving the legacy bus for other topics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-hybrid-events-'));
    const legacyEvents: any[] = [];
    const legacy: any = { start: async () => {}, stop: async () => {}, publish: async (event: any) => { const result = { ...event, id: 'legacy', sequence: legacyEvents.length + 1, at: Date.now() }; legacyEvents.push(result); return result; }, poll: async () => legacyEvents, subscribeStream: () => ({ events: (async function* () {})(), close: () => {} }) };
    const migrated = new MessageLogEventBus(new MessageLog({ name: 'migrated', append_only: true, format: 'parquet', path: root, segment_max_rows: 1, write_mode: 'durable' }));
    const bus = new HybridEventBus(legacy, migrated, ['orders.*']);
    await bus.start();
    await bus.publish({ topic: 'orders.created', payload: { id: 'migrated' } } as any);
    await bus.publish({ topic: 'chat.message.created', payload: { id: 'legacy' } } as any);
    expect(legacyEvents).toHaveLength(1);
    await expect(bus.poll({ topic: 'orders.created' })).resolves.toHaveLength(1);
    await bus.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('keeps the previous dispatch key verifiable during rotation', async () => {
    const ring = await DispatchSigningKeyRing.create();
    const old = await ring.issue({ aud: 'orders', source_service: 'gateway', command_class: 'orders.read', permissions: [], authz_version: 1 });
    await ring.rotate('dispatch-next');
    const next = await ring.issue({ aud: 'orders', source_service: 'gateway', command_class: 'orders.read', permissions: [], authz_version: 1 });
    await expect(ring.verify(old, 'orders')).resolves.toMatchObject({ authz_version: 1 });
    await expect(ring.verify(next, 'orders')).resolves.toMatchObject({ authz_version: 1 });
  });

  it('deduplicates completed mutating calls', () => {
    const inbox = new IdempotencyInbox();
    expect(inbox.begin('k1').fresh).toBe(true);
    inbox.complete('k1', { ok: true });
    expect(inbox.begin('k1')).toEqual({ fresh: false, response: { ok: true } });
  });

  it('uses the same message-log contract with an object-store backend', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-s3-message-log-'));
    const objects = new Map<string, Uint8Array>();
    const objectStore = { get: async (key: string) => objects.get(key) || null, put: async (key: string, value: Uint8Array) => { objects.set(key, new Uint8Array(value)); } };
    const first = new MessageLog({ name: 'orders', append_only: true, format: 'parquet', backend: 's3', prefix: 'orders', path: join(root, 'writer') }, { objectStore });
    await first.start();
    await first.append({ type: 'order.created', source_service: 'order', payload: { order_id: 'o2' } });
    await first.flush();
    await first.stop();
    const second = new MessageLog({ name: 'orders', append_only: true, format: 'parquet', backend: 's3', prefix: 'orders', path: join(root, 'reader') }, { objectStore });
    await second.start();
    await expect(second.tail()).resolves.toEqual([expect.objectContaining({ payload: { order_id: 'o2' } })]);
    await second.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('signs S3-compatible object-store requests with a valid SigV4 timestamp', async () => {
    const originalFetch = globalThis.fetch;
    let captured: Headers | undefined;
    globalThis.fetch = (async (_input, init) => {
      captured = new Headers(init?.headers);
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    try {
      await new FetchObjectStore('http://minio.local', 'core3', { accessKeyId: 'access', secretAccessKey: 'secret', region: 'us-east-1' }).put('orders/manifest.json', new TextEncoder().encode('{}'), 'application/json');
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(captured?.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=access\//);
    expect(captured?.get('x-amz-date')).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it('propagates direct-call protocol headers over HTTP', async () => {
    let captured: Headers | undefined;
    const caller = createDirectCaller(new Map(), async (_input, init) => { captured = init?.headers as Headers; return new Response(JSON.stringify({ ok: true })); });
    await expect(caller({ serviceId: 'orders', instanceId: 'i', transport: 'http', execution: 'http', baseUrl: 'http://orders', ttlMs: 1000 }, { topic: 'orders.create', version: 1 }, { id: 'o1' }, { sourceService: 'gateway', dispatchToken: 't', correlationId: 'c', deadlineMs: 1000, idempotencyKey: 'k', cancelledAfter: 'c' })).resolves.toEqual({ ok: true });
    expect(captured?.get('authorization')).toBe('Bearer t');
    expect(captured?.get('x-correlation-id')).toBe('c');
    expect(captured?.get('x-idempotency-key')).toBe('k');
  });

  it('keeps deadline and cancellation context on the in-process transport', async () => {
    let received: any;
    const caller = createDirectCaller(new Map([['orders', async (_definition, _payload, options) => { received = options; return { ok: true }; }]]));
    const deadlineAt = Date.now() + 1000;
    await caller({ serviceId: 'orders', instanceId: 'i', transport: 'inproc', execution: 'inproc', baseUrl: 'http://orders', ttlMs: 1000 }, { topic: 'orders.read', version: 1 }, {}, { deadlineAt, cancelledAfter: 'c1', correlationId: 'c1', causationId: 'c0' });
    expect(received).toMatchObject({ deadlineAt, cancelledAfter: 'c1', correlationId: 'c1', causationId: 'c0' });
  });
});
