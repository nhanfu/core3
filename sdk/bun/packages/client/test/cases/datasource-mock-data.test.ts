import { describe, expect, it } from 'vitest';
import { datasourceMethods } from '@core3/server/datasource-runtime';
import { createYamlApi } from '@core3/server/routes/yaml-api';

describe('YAML datasource mock data', () => {
  it('resolves a named fixture state without touching the database', async () => {
    const result = await datasourceMethods.querySource.call({}, {
      id: 'orders',
      permission: 'orders.read',
      mock_data: {
        default: [{ id: 'default-order' }],
        states: { empty: [], filtered: [{ id: 'filtered-order' }] },
      },
    }, { mock_state: 'filtered' }, 0, 25);

    expect(result).toEqual({
      data: [{ id: 'filtered-order' }],
      meta: { total: 1, page: 1, pageSize: 25, pages: 1 },
    });
  });

  it('supports single-record fixtures and paginates list fixtures', async () => {
    const single = await datasourceMethods.querySource.call({}, {
      id: 'order',
      single: true,
      mock_data: { default: { id: 'order-1' } },
    }, {}, 0, 25);
    const page = await datasourceMethods.querySource.call({}, {
      id: 'orders',
      mock_data: { default: [{ id: 'order-1' }, { id: 'order-2' }] },
    }, {}, 1, 1);

    expect(single).toEqual({ data: { id: 'order-1' }, meta: {} });
    expect(page.data).toEqual([{ id: 'order-2' }]);
    expect(page.meta).toMatchObject({ total: 2, page: 2, pageSize: 1, pages: 2 });
  });

  it('prefetches a mock-backed page without a database', async () => {
    const api = createYamlApi({
      repository: { querySource: datasourceMethods.querySource },
      authProvider: {
        getCurrentUser: async () => ({ sub: 'user-1', preferred_lang: 'en' }),
        hasPermission: () => true,
      },
      sources: new Map([['orders', {
        id: 'orders',
        permission: 'orders.read',
        mock_data: { default: [{ id: 'order-1' }] },
      }]]),
      pageSources: new Map([['orders', ['orders']]]),
      pages: new Map([['orders', { page: { id: 'orders' }, datasources: [] }]]),
      catalogs: new Map(),
      menus: new Map(),
      workflows: new Map(),
      workflowFiles: new Map(),
      permissions: {},
      uploadRoot: '.',
      eventStore: {},
      topics: { register() {}, start() {}, stop() {} },
    } as any);

    const response = await api(new Request('http://localhost/api/pages/orders'), new URL('http://localhost/api/pages/orders'));
    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({
      datasources: [{ id: 'orders', data: [{ id: 'order-1' }], meta: { total: 1 } }],
    });
  });
});
