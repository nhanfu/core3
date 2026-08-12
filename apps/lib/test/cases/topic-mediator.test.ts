import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventStore } from '../../server/event-store.ts';
import { TopicMediator } from '../../topics/mediator.ts';

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
});
