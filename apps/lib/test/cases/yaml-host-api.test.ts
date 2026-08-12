import { describe, expect, it } from 'vitest';
import { createYamlHostApi } from '../../server/routes/yaml-host-api.ts';

function service(id: string, pageId: string, sourceId: string) {
  return {
    id,
    menus: new Map(id === 'order' ? [['order', { module: id, config: { menu: { dashboard: { path: '/orders' } } } }]] : []),
    pages: new Map([[pageId, { page: { id: pageId } }]]),
    datasources: new Map([[sourceId, { id: sourceId }]]),
    actions: new Map([[`${id}.save`, { action: `${id}.save`, type: 'server' }]]),
    api: async (request: Request) => new Response(JSON.stringify({ service: id, path: new URL(request.url).pathname })),
    storage: {},
  } as any;
}

describe('YAML host API routing', () => {
  it('routes pages, actions, and datasources to their owning YAML service', async () => {
    const api = createYamlHostApi([service('chat', 'chat', 'chat_threads'), service('order', 'orders', 'orders')]);

    const page = await api(new Request('http://localhost/api/pages/orders'), new URL('http://localhost/api/pages/orders'));
    expect(await page?.json()).toEqual({ service: 'order', path: '/api/pages/orders' });

    const action = await api(new Request('http://localhost/api/actions/chat.save', { method: 'POST', body: '{}' }), new URL('http://localhost/api/actions/chat.save'));
    expect(await action?.json()).toEqual({ service: 'chat', path: '/api/actions/chat.save' });

    const query = await api(new Request('http://localhost/api/query', { method: 'POST', body: JSON.stringify({ sourceId: 'chat_threads' }) }), new URL('http://localhost/api/query'));
    expect(await query?.json()).toEqual({ service: 'chat', path: '/api/query' });
  });

  it('returns the combined declarative menu', async () => {
    const api = createYamlHostApi([service('chat', 'chat', 'chat_threads'), service('order', 'orders', 'orders')]);
    const response = await api(new Request('http://localhost/api/menu'), new URL('http://localhost/api/menu'));
    expect(await response?.json()).toEqual([{ module: 'order', menu: { dashboard: { path: '/orders' } }, i18n: {} }]);
  });

  it('does not claim routes owned by infrastructure modules', async () => {
    const api = createYamlHostApi([service('chat', 'chat', 'chat_threads'), service('order', 'orders', 'orders')]);
    const response = await api(new Request('http://localhost/api/auth/login', { method: 'POST' }), new URL('http://localhost/api/auth/login'));
    expect(response).toBeNull();
  });
});
