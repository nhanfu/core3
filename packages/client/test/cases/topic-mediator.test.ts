import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventStore } from '@core3/med';
import { TopicMediator } from '@core3/server/topics/mediator';
import { AUTH_USER_LOOKUP } from '../../../../apps/services/auth/topics.ts';

describe('TopicMediator', () => {
  it('routes a request to a registered handler and returns its response', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-topic-'));
    const store = new EventStore({ databasePath: join(root, 'events'), schema: { columns: [] } });
    await store.start();
    const provider = new TopicMediator(store, 'auth-node');
    provider.register({
      definition: { topic: 'auth.user.resolve', version: 1, kind: 'query' },
      handle: (payload: { token: string }) => ({ subject: payload.token, permissions: ['orders.read'] }),
    });
    provider.start();
    const caller = new TopicMediator(store, 'tms-node');
    await expect(caller.request(
      { topic: 'auth.user.resolve', version: 1, kind: 'query' },
      { token: 'user-1' },
    )).resolves.toEqual({ subject: 'user-1', permissions: ['orders.read'] });
    provider.stop();
    await store.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('routes an order-style user lookup through the Auth data topic', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core3-auth-topic-'));
    const store = new EventStore({ databasePath: join(root, 'events'), schema: { columns: [] } });
    await store.start();
    const auth = new TopicMediator(store, 'auth-node');
    auth.register({
      definition: AUTH_USER_LOOKUP,
      handle: (payload) => payload.email === 'admin@tms.local'
        ? { id: 'user-admin', email: payload.email, name: 'Admin User', enabled: true }
        : null,
    });
    auth.start();
    const order = new TopicMediator(store, 'order-node');
    await expect(order.request(AUTH_USER_LOOKUP, { email: 'admin@tms.local' })).resolves.toMatchObject({ id: 'user-admin' });
    auth.stop();
    await store.stop();
    await rm(root, { recursive: true, force: true });
  });
});
